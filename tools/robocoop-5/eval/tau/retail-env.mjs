// JS port of tau-bench's retail environment (tools + grading), validated against the official
// Python implementation via fidelity-check.mjs (replays every task's ground-truth actions and
// compares final-state deltas with the Python oracle in retail-export.json).
//
// Faithfulness notes:
// - pyRound emulates Python round() (banker's rounding at the double level after scaling).
// - Observations serialize with pyDumps (Python json.dumps spacing) so trajectories look official;
//   integral floats ("100.0" vs "100") may differ cosmetically — state grading is numeric, not textual.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "..", "tau-src", "tau_bench", "envs", "retail", "data");

export function loadData() {
  return {
    orders: JSON.parse(readFileSync(join(DATA_DIR, "orders.json"), "utf8")),
    products: JSON.parse(readFileSync(join(DATA_DIR, "products.json"), "utf8")),
    users: JSON.parse(readFileSync(join(DATA_DIR, "users.json"), "utf8")),
  };
}

export function pyRound(x, nd = 0) {
  const m = 10 ** nd;
  const y = x * m;
  let r = Math.round(y);
  if (Math.abs(r - y) === 0.5) r = 2 * Math.round(y / 2); // ties to even
  else if (y < 0 && r - y === 0.5) r = r - 1; // Math.round(-2.5) === -2 handled above; guard asymmetric ties
  return r / m;
}

export function pyDumps(v) {
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(pyDumps).join(", ") + "]";
  return "{" + Object.entries(v).map(([k, x]) => JSON.stringify(k) + ": " + pyDumps(x)).join(", ") + "}";
}

const count = (arr, x) => arr.filter((v) => v === x).length;

export const TOOLS = {
  calculate(data, { expression }) {
    if (![...expression].every((c) => "0123456789+-*/(). ".includes(c)))
      return "Error: invalid characters in expression";
    try {
      const v = Function(`"use strict"; return (${expression});`)();
      if (typeof v !== "number" || !Number.isFinite(v)) return "Error: division by zero";
      const r = pyRound(v, 2);
      return Number.isInteger(r) ? r.toFixed(1) : String(r);
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },

  cancel_pending_order(data, { order_id, reason }) {
    const orders = data.orders;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "pending") return "Error: non-pending order cannot be cancelled";
    if (!["no longer needed", "ordered by mistake"].includes(reason)) return "Error: invalid reason";
    const refunds = [];
    for (const payment of order.payment_history) {
      const payment_id = payment.payment_method_id;
      refunds.push({ transaction_type: "refund", amount: payment.amount, payment_method_id: payment_id });
      if (payment_id.includes("gift_card")) {
        const pm = data.users[order.user_id].payment_methods[payment_id];
        pm.balance = pyRound(pm.balance + payment.amount, 2);
      }
    }
    order.status = "cancelled";
    order.cancel_reason = reason;
    order.payment_history.push(...refunds);
    return pyDumps(order);
  },

  exchange_delivered_order_items(data, { order_id, item_ids, new_item_ids, payment_method_id }) {
    const { products, orders, users } = data;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "delivered") return "Error: non-delivered order cannot be exchanged";
    const all_item_ids = order.items.map((it) => it.item_id);
    for (const item_id of item_ids)
      if (count(item_ids, item_id) > count(all_item_ids, item_id)) return `Error: ${item_id} not found`;
    if (item_ids.length !== new_item_ids.length) return "Error: the number of items to be exchanged should match";
    let diff_price = 0;
    for (let i = 0; i < item_ids.length; i++) {
      const item = order.items.find((it) => it.item_id === item_ids[i]);
      const product_id = item.product_id;
      const variant = products[product_id].variants[new_item_ids[i]];
      if (!(variant && variant.available)) return `Error: new item ${new_item_ids[i]} not found or available`;
      diff_price += variant.price - item.price;
    }
    diff_price = pyRound(diff_price, 2);
    if (!(payment_method_id in users[order.user_id].payment_methods)) return "Error: payment method not found";
    const pm = users[order.user_id].payment_methods[payment_method_id];
    if (pm.source === "gift_card" && pm.balance < diff_price)
      return "Error: insufficient gift card balance to pay for the price difference";
    order.status = "exchange requested";
    order.exchange_items = [...item_ids].sort();
    order.exchange_new_items = [...new_item_ids].sort();
    order.exchange_payment_method_id = payment_method_id;
    order.exchange_price_difference = diff_price;
    return pyDumps(order);
  },

  find_user_id_by_email(data, { email }) {
    for (const [user_id, profile] of Object.entries(data.users))
      if (profile.email.toLowerCase() === email.toLowerCase()) return user_id;
    return "Error: user not found";
  },

  find_user_id_by_name_zip(data, { first_name, last_name, zip }) {
    for (const [user_id, profile] of Object.entries(data.users))
      if (
        profile.name.first_name.toLowerCase() === first_name.toLowerCase() &&
        profile.name.last_name.toLowerCase() === last_name.toLowerCase() &&
        profile.address.zip === zip
      )
        return user_id;
    return "Error: user not found";
  },

  get_order_details(data, { order_id }) {
    return order_id in data.orders ? pyDumps(data.orders[order_id]) : "Error: order not found";
  },

  get_product_details(data, { product_id }) {
    return product_id in data.products ? pyDumps(data.products[product_id]) : "Error: product not found";
  },

  get_user_details(data, { user_id }) {
    return user_id in data.users ? pyDumps(data.users[user_id]) : "Error: user not found";
  },

  list_all_product_types(data) {
    const dict = {};
    for (const p of Object.values(data.products)) dict[p.name] = p.product_id;
    const sorted = {};
    for (const k of Object.keys(dict).sort()) sorted[k] = dict[k];
    return pyDumps(sorted);
  },

  modify_pending_order_address(data, { order_id, address1, address2, city, state, country, zip }) {
    const orders = data.orders;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "pending") return "Error: non-pending order cannot be modified";
    order.address = { address1, address2, city, state, country, zip };
    return pyDumps(order);
  },

  modify_pending_order_items(data, { order_id, item_ids, new_item_ids, payment_method_id }) {
    const { products, orders, users } = data;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "pending") return "Error: non-pending order cannot be modified";
    const all_item_ids = order.items.map((it) => it.item_id);
    for (const item_id of item_ids)
      if (count(item_ids, item_id) > count(all_item_ids, item_id)) return `Error: ${item_id} not found`;
    if (item_ids.length !== new_item_ids.length) return "Error: the number of items to be exchanged should match";
    let diff_price = 0;
    for (let i = 0; i < item_ids.length; i++) {
      const item = order.items.find((it) => it.item_id === item_ids[i]);
      const variant = products[item.product_id].variants[new_item_ids[i]];
      if (!(variant && variant.available)) return `Error: new item ${new_item_ids[i]} not found or available`;
      diff_price += variant.price - item.price;
    }
    if (!(payment_method_id in users[order.user_id].payment_methods)) return "Error: payment method not found";
    const pm = users[order.user_id].payment_methods[payment_method_id];
    if (pm.source === "gift_card" && pm.balance < diff_price)
      return "Error: insufficient gift card balance to pay for the new item";
    order.payment_history.push({
      transaction_type: diff_price > 0 ? "payment" : "refund",
      amount: Math.abs(diff_price),
      payment_method_id,
    });
    if (pm.source === "gift_card") pm.balance = pyRound(pm.balance - diff_price, 2);
    for (let i = 0; i < item_ids.length; i++) {
      const item = order.items.find((it) => it.item_id === item_ids[i]);
      item.item_id = new_item_ids[i];
      item.price = products[item.product_id].variants[new_item_ids[i]].price;
      item.options = products[item.product_id].variants[new_item_ids[i]].options;
    }
    order.status = "pending (item modified)";
    return pyDumps(order);
  },

  modify_pending_order_payment(data, { order_id, payment_method_id }) {
    const orders = data.orders;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "pending") return "Error: non-pending order cannot be modified";
    if (!(payment_method_id in data.users[order.user_id].payment_methods))
      return "Error: payment method not found";
    if (order.payment_history.length > 1 || order.payment_history[0].transaction_type !== "payment")
      return "Error: there should be exactly one payment for a pending order";
    if (order.payment_history[0].payment_method_id === payment_method_id)
      return "Error: the new payment method should be different from the current one";
    const amount = order.payment_history[0].amount;
    const pm = data.users[order.user_id].payment_methods[payment_method_id];
    if (pm.source === "gift_card" && pm.balance < amount)
      return "Error: insufficient gift card balance to pay for the order";
    order.payment_history.push(
      { transaction_type: "payment", amount, payment_method_id },
      { transaction_type: "refund", amount, payment_method_id: order.payment_history[0].payment_method_id },
    );
    if (pm.source === "gift_card") pm.balance = pyRound(pm.balance - amount, 2);
    if (order.payment_history[0].payment_method_id.includes("gift_card")) {
      const old_pm = data.users[order.user_id].payment_methods[order.payment_history[0].payment_method_id];
      old_pm.balance = pyRound(old_pm.balance + amount, 2);
    }
    return pyDumps(order);
  },

  modify_user_address(data, { user_id, address1, address2, city, state, country, zip }) {
    const users = data.users;
    if (!(user_id in users)) return "Error: user not found";
    users[user_id].address = { address1, address2, city, state, country, zip };
    return pyDumps(users[user_id]);
  },

  return_delivered_order_items(data, { order_id, item_ids, payment_method_id }) {
    const orders = data.orders;
    if (!(order_id in orders)) return "Error: order not found";
    const order = orders[order_id];
    if (order.status !== "delivered") return "Error: non-delivered order cannot be returned";
    if (!(payment_method_id in data.users[order.user_id].payment_methods))
      return "Error: payment method not found";
    if (!payment_method_id.includes("gift_card") && payment_method_id !== order.payment_history[0].payment_method_id)
      return "Error: payment method should be either the original payment method or a gift card";
    const all_item_ids = order.items.map((it) => it.item_id);
    for (const item_id of item_ids)
      if (count(item_ids, item_id) > count(all_item_ids, item_id)) return "Error: some item not found";
    order.status = "return requested";
    order.return_items = [...item_ids].sort();
    order.return_payment_method_id = payment_method_id;
    return pyDumps(order);
  },

  think() {
    return "";
  },

  transfer_to_human_agents() {
    return "Transfer successful";
  },
};

export function invokeTool(data, name, kwargs) {
  const fn = TOOLS[name];
  if (!fn) return `Unknown action ${name}`;
  try {
    return fn(data, kwargs || {});
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// ---- grading ----
const NUM_EPS = 1e-9;
export function deepEq(a, b) {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= NUM_EPS;
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => deepEq(v, b[i]));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && deepEq(a[k], b[k]));
  }
  return false;
}

// key-order-insensitive (a tool may rebuild an object with identical values in a new order —
// the Python oracle compares with sort_keys=True)
function sortedStringify(v) {
  if (Array.isArray(v)) return "[" + v.map(sortedStringify).join(",") + "]";
  if (v && typeof v === "object")
    return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + sortedStringify(v[k])).join(",") + "}";
  return JSON.stringify(v);
}

export function stateDelta(initial, final) {
  const d = {};
  for (const section of ["orders", "products", "users"]) {
    const ch = {};
    for (const [k, v] of Object.entries(final[section]))
      if (sortedStringify(v) !== sortedStringify(initial[section][k])) ch[k] = v;
    if (Object.keys(ch).length) d[section] = ch;
  }
  return d;
}

// reward per tau_bench.envs.base.Env.calculate_reward: final-state match AND required outputs
// appear (lowercased, commas stripped) in the agent's messages to the user.
export function grade(task, initialData, finalData, agentReplies) {
  const delta = stateDelta(initialData, finalData);
  const r_actions = deepEq(delta, task.oracle_delta);
  let r_outputs = true;
  const missing = [];
  for (const output of task.outputs || []) {
    const found = agentReplies.some((c) => (c || "").toLowerCase().replace(/,/g, "").includes(output.toLowerCase()));
    if (!found) { r_outputs = false; missing.push(output); }
  }
  return { reward: r_actions && r_outputs ? 1 : 0, r_actions, r_outputs, missing, delta };
}

export const USER_SIM_RULES = `Rules:
- Just generate one line at a time to simulate the user's message.
- Do not give away all the instruction at once. Only provide the information that is necessary for the current step.
- Do not hallucinate information that is not provided in the instruction. For example, if the agent asks for the order id but it is not mentioned in the instruction, do not make up an order id, just say you do not remember or have it.
- If the instruction goal is satisified, generate '###STOP###' as a standalone message without anything else to end the conversation.
- Do not repeat the exact instruction in the conversation. Instead, use your own words to convey the same information.
- Try to make the conversation as natural as possible, and stick to the personalities in the instruction.`;

export function userSimSystemPrompt(instruction) {
  return `You are a user interacting with an agent.\n\nInstruction: ${instruction}\n\n${USER_SIM_RULES}`;
}
