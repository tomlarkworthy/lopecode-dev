# Learner tasks

Each task is a program made of named top-level cells. The checker reads the named cells' values, calls the named actions, and (for .tsx) inspects the view cells' rendered elements. Cell names below are exact. Extra helper cells are allowed. "Action" means a callable cell that, when called with the stated arguments, changes the stated state. "State" means a cell holding a value that actions change; cells derived from it update afterwards.

## 01 orders-total (.ts)
Data, in this order: orders `{id, customer, amount, paid}`: {1,"ann",30,true}, {2,"bob",12.5,false}, {3,"ann",7.5,true}, {4,"cy",100,true}.
Cells to expose: `paidTotal` = sum of amounts of paid orders, must equal 137.5. `bigCustomers` = customers (in order) of orders with amount > 20, must equal ["ann","cy"].

## 02 sort-people (.ts)
Data, in this order: people `{name, age}`: {"zoe",30}, {"adam",25}, {"bea",30}, {"carl",19}.
Sort by age ascending, ties by name ascending (alphabetical). Cell `names` = the sorted names joined by "," and must equal the string "carl,adam,bea,zoe".

## 03 group-by (.ts)
Data: words = ["apple","avocado","banana","blueberry","cherry"].
Group the words by first letter. Cell `letterCounts` must equal the string "a:2 b:2 c:1" (letter, colon, group size, groups separated by one space, in order of first appearance).

## 04 squares-loop (.ts)
Data: n = 6.
Cell `squares` = the squares of 1..n, must equal [1,4,9,16,25,36]. Cell `sumSquares` = their sum, must equal 91.

## 05 index-by-id (.ts)
Data, in this order: users `{id, name}`: {"u1","Ann"}, {"u2","Bob"}, {"u3","Cy"}.
Build a lookup from id to user. Cell `nameOfU2` = name of the user with id "u2", must equal "Bob".

## 06 dedupe-set (.ts)
Data: tags = ["js","ts","js","go","ts","rust"].
Cell `unique` = tags without duplicates, first-appearance order: ["js","ts","go","rust"]. Cell `uniqueSorted` = the same, sorted alphabetically: ["go","js","rust","ts"]. Cell `seenTwice` = tags that occur more than once, in order of the first time a repeat is seen: ["js","ts"].

## 07 word-count-map (.ts)
Data: text = "the cat and the hat and the bat".
Count words (split on single spaces). Cell `top` = the two most frequent words as strings "word=count", most frequent first: ["the=3","and=2"].

## 08 format-table (.ts)
Data, in this order: rows `{item, price, qty}`: {"tea",3.5,2}, {"cake",12,1}.
Cell `report` = one line per row joined with "\n". A line is: item left-justified in 6 chars, qty right-justified in 3 chars, then " x ", unit price as "$" + 2 decimals, " = ", line total in the same money format. `report` must equal exactly the string:
"tea     2 x $3.50 = $7.00\ncake    1 x $12.00 = $12.00"

## 09 dates (.ts)
Data: start = "2026-01-10", end = "2026-03-01" (ISO date strings).
Cell `daysBetween` = whole days from start to end, must equal 50. Cell `endWeekday` = three-letter weekday name of the end date (Sun, Mon, ...), must equal "Sun". Treat dates as UTC.

## 10 chunk-zip (.ts)
Write a reusable generic function that splits a list into chunks of a given size (last chunk may be shorter) and one that pairs up two lists element by element.
Cell `chunks` = chunking [1,2,3,4,5] by 2, must equal [[1,2],[3,4],[5]]. Cell `pairs` = pairing ["a","b"] with [1,2], must equal [["a",1],["b",2]].

## 11 binary-search (.ts)
Data: sortedNums = [1,3,5,7,9,11,13].
Write a binary search function returning the index of a target in a sorted list, or -1. Cell `found` = [search for 7, search for 8] in sortedNums, must equal [3,-1].

## 12 memo-fib (.ts)
Write a memoised Fibonacci function (fib(0)=0, fib(1)=1) fast enough for n=50. Cell `fib50` = fib(50), must equal 12586269025.

## 13 tree-walk (.ts)
Data: tree is `{value, children}`: 1 with children [ 2 with children [4], 3 ]. (Leaves have `children: []`.)
Cell `stats` = object `{sum, depth}`: sum of all values (10) and depth counting nodes on the longest root-to-leaf path (3); must equal {sum:10, depth:3} with keys in that order. Cell `flatten` = values in depth-first pre-order, must equal [1,2,4,3].

## 14 matrix-typed (.ts)
Matrices are `{rows, cols, data}` with row-major numeric `data` held as a Float64Array. A = 2x2 [1,2,3,4], I = 2x2 identity [1,0,0,1]. Write matrix multiplication.
Cell `AA` = A times A, a matrix whose `data` equals [7,10,15,22] (other fields rows 2, cols 2). Cell `AI` = A times I as a plain array of numbers, must equal [1,2,3,4].

## 15 csv-line (.ts)
Write a CSV line parser: comma separated, a field may be wrapped in double quotes (may contain commas), a doubled quote inside quotes is a literal quote.
Cell `parsed` = result of parsing the line `a,"b,c",d,"say ""hi"""` (as it appears, with those quote characters), must equal the array: a | b,c | d | say "hi" i.e. ["a","b,c","d","say \"hi\""].

## 16 lru-cache (.ts)
Write a generic least-recently-used cache factory taking a capacity; the cache has get(key), put(key, value) and keys() (oldest to newest use). Both get (on a hit) and put refresh recency; put beyond capacity evicts the least recently used.
Cell `lruDemo`: capacity 2; put a=1, put b=2, get a, put c=3; result = keys(). Must equal ["a","c"].

## 17 counter (.tsx)
A click counter. State holds a count starting at 0. Cell `label` = "0 clicks", "1 click" (singular exactly when count is 1), "2 clicks", etc. Cell `app` is a view containing four buttons with text "-", "+" and "reset" and an output showing the label. "+" adds 1, "-" subtracts 1 but never below 0, "reset" sets 0.
Checker: label "0 clicks"; click "+", "+" -> "2 clicks"; click "-" -> "1 click"; click "reset" -> "0 clicks". Buttons are found by text content in `app`'s element tree and their click handler is invoked with no arguments.

## 18 todos (.ts)
Todo items `{id, text, done}`, starting empty; ids assigned 1, 2, 3... in creation order; `done` starts false.
Actions: `addTodo(text)`, `toggleTodo(id)` (flip done), `removeTodo(id)`. State cell `todos` (the array). Cell `remaining` = number of not-done todos.
Checker: addTodo("a"), addTodo("b"), toggleTodo(1) -> remaining 1; removeTodo(2) -> remaining 0 and `todos` has length 1.

## 19 form-validation (.tsx)
A form with state `{email, age}` both strings, initially empty. Actions `setEmail(v)` and `setAge(v)` (string arguments). Cell `errors` = list of messages: "email needs an @" if the email lacks "@"; "age must be a whole number 0-150" unless age is a whole number from 0 to 150 (an empty age counts as an error). Messages in that order. Cell `valid` = errors is empty. Cell `formView` shows two inputs (email text, age number), the error messages as paragraphs, and a submit button disabled unless valid.
Checker: initially `errors` has length 2; setEmail("a@b"), setAge("30") -> valid true; setAge("x") -> errors equals ["age must be a whole number 0-150"].

## 20 undo-stack (.ts)
A value history with undo and redo; the value starts at 0. Actions: `setValue(v)` (sets value, clears redo), `undo()` (no-op if nothing to undo), `redo()` (no-op if nothing to redo). Cell `current` = the present value.
Checker: setValue(1), setValue(2), undo -> 1; redo -> 2; undo, undo -> 0; undo -> still 0.

## 21 cart (.ts)
Catalog, in order: {sku "A", name "apple", price 0.5}, {"B","bread",2.25}, {"C","cheese",6}.
State: cart of lines `{sku, qty}`, empty at start. Action `addToCart(sku)` adds a line or increments qty. Cells: `subtotal` = sum of price*qty; `tax` = 20% of subtotal rounded to 2 decimals; `total` = subtotal + tax.
Checker: addToCart "A", "A", "C" -> subtotal 7, tax 1.4, total 8.4.

## 22 pagination (.ts)
Data: items = "item 1" ... "item 23" (23 strings), pageSize = 5. State `page` (zero-based), starts at 0. Cell `pageCount` = ceil(items / pageSize) = 5. Cell `visible` = items on the current page. Actions `nextPage()` (not past the last page), `prevPage()` (not below 0).
Checker: initially pageCount 5, visible ["item 1".."item 5"]; five nextPage calls -> page 4, visible ["item 21","item 22","item 23"]; prevPage -> page 3.

## 23 selection-set (.ts)
Data: ids = [1,2,3,4,5]. State `selected` holds a set of numbers, empty at start. Actions `toggle(id)` (add/remove), `selectAll()`, `clearSel()`. Cell `selectedList` = selected values as an ascending array.
Checker: toggle 2, toggle 4, toggle 2 -> [4]; selectAll -> [1,2,3,4,5]; clearSel -> [].

## 24 reducer (.ts)
Account state `acct` = `{balance, log}`, initially {0, []}. A pure reducer `reduce(state, event)` for events `{type:"deposit", amount}`, `{type:"withdraw", amount}`, `{type:"reset"}`: deposit adds and logs "+N"; withdraw of more than the balance leaves the balance and logs "refused"; otherwise subtracts and logs "-N"; reset gives {0, []}. Action `dispatch(event)` applies it to `acct`.
Cell `test_reduce` runs deposit 10, withdraw 3, withdraw 30 from an empty account, throws if the balance is not 7, otherwise evaluates to the log joined with spaces: "+10 -3 refused".
Checker: `test_reduce` equals that string; dispatch({type:"deposit",amount:5}) -> `acct.balance` is 5.

## 25 memo-cache (.ts)
A deliberately slow function that squares n by adding n to an accumulator n times, wrapped so repeated calls with the same argument reuse the earlier result. Data: inputs = [1000,2000,1000,3000,2000]. Cell `results` = the function mapped over inputs: [1000000,4000000,1000000,9000000,4000000].
Also state `priceCache` (object sku -> price, initially {}), action `rememberPrice(sku, price)`. Checker: rememberPrice("A", 2) -> priceCache equals {"A":2}.

## 26 timer-tick (.ts)
Time source: the host clock (a function returning milliseconds; in the test each reading advances 16). State `running` (boolean, starts true), state `elapsed` (starts 0). While running, a stream `clock` emits the time since the previous emission, forever; each emission is added to `elapsed` via action `addTime(dt)`. Cell `seconds` = elapsed/1000 formatted with 1 decimal plus "s" (e.g. "0.1s"). Action `stop()` sets running false, which ends the stream.
Checker: after letting the program run, `elapsed` > 0; after `stop()` and settling, `elapsed` no longer changes.

## 27 input-to-state (.tsx)
Data: fruits = ["apple","banana","cherry","grape","pineapple"]. State `query` (string, starts ""). Action `setQuery(s)` stores s trimmed and lowercased. Cell `matches` = fruits that contain the query. Cell `searchView` has a text input (its input handler receives the typed string, wired to setQuery, value shown is the query) and a span "N matches: a, b".
Checker: call the input's handler with " APPle " -> `query` "apple", `matches` ["apple","pineapple"].

## 28 batch-accumulate (.ts)
Time source: the host clock (function returning ms). A stream `keys` emits one event per character of "hello world" in order, as `{key, t}` where t is the clock reading. State `buffer` (list of keys, starts []) and `flushed` (list of strings, starts []). Action `onKey(event)`: append the key to the buffer; if the key is " " or the buffer reaches 5 keys, append the joined buffer to `flushed` and empty the buffer. Wire the stream to the action (`listen`).
Checker (after letting it run): `flushed` equals ["hello"," ","world"], `buffer` equals [].

## 29 log-clicks (.tsx)
Time source: the host clock (function returning ms; in the test each reading advances 16). State `clicks` = list of click timestamps, starts []. Action `recordClick()` appends the clock reading. Cell `clickCount` = clicks length. Cell `lastGap` = difference of the last two timestamps, or null when fewer than two clicks. Cell `clickView` = a single button whose text is "clicked N" (N = clickCount) wired to recordClick.
Checker: invoke the button's click handler 3 times -> clickCount 3 and `lastGap` is a number.

## 30 fetch-json (.ts)
Fetch https://example.test/repos.json, which returns:
[{"name":"a","stars":5,"language":"ts"},{"name":"b","stars":9,"language":"go"},{"name":"c","stars":1,"language":"ts"}]
Cell `repos` = the parsed list. Cell `topRepo` = repo with most stars (object with `name`; "b"). Cell `languages` = distinct languages in first-appearance order: ["ts","go"].

## 31 parallel-fetch (.ts)
Data: skus = ["A","B","C"]. Fetch in parallel https://example.test/price/A, /price/B, /price/C, returning {"sku":"A","price":3}, {"sku":"B","price":1}, {"sku":"C","price":2}. Cell `prices` = the three parsed objects in sku order. Cell `cheapest` = sku of the lowest price, must equal "B".

## 32 fetch-errors (.ts)
Fetch https://example.test/missing.json. The harness answers it with HTTP status 404 (body "not found", not JSON). Cell `loadConfig` = a result: on a non-ok response, failure with message "HTTP <status>"; on success the parsed config `{theme}`; a thrown error is a failure with the error text. Cell `theme` = the config's theme when successful, else "default". Cell `problem` = "" when successful, else the failure message.
Checker: `theme` "default", `problem` "HTTP 404".

## 33 fetch-into-state (.ts)
State `userId` (number, starts 1). Cell `profile` fetches https://example.test/users/<userId> (users/1 returns {"name":"ann"}, users/2 returns {"name":"bob"}) and refetches when userId changes. A stream `names` emits each loaded profile's name; each emitted name is appended to state `seen` (list of strings, starts []) via action `remember(name)`, wired up in a cell `onName`. Action `nextUser()` increments userId.
Checker: after settling, `seen` ["ann"]; nextUser(), settle -> `seen` ["ann","bob"].

## 34 list-view (.tsx)
State `items` of `{id, name}`, in order: {1,"milk"}, {2,"eggs"}, {3,"flour"}. Action `removeItem(id)`. Cell `listView` renders one row per item in order: a span with the name and a button "remove" whose click handler (no arguments) removes that item.
Checker: `listView` contains exactly 3 buttons; invoke the second one's click handler -> `items` names are ["milk","flour"].

## 35 conditional-view (.tsx)
State `load` is one of: loading; error with message; done with a list of row strings. Starts loading. Action `finish()` sets done with rows ["a","b"]; action `fail()` sets error with message "timeout". Cell `statusView`: loading shows a paragraph "loading…" (with the ellipsis character); error shows a paragraph "failed: timeout" (i.e. "failed: " + message); done shows a container with one span per row (and a paragraph "no rows" only if the list is empty).
Checker: initial text "loading…"; after finish(), exactly 2 span elements; after fail(), text "failed: timeout".

## 36 form-view (.tsx)
State `draft` (string, starts "") and `messages` (list of strings, starts []). Action `typeDraft(s)` sets draft to s as given (untrimmed). Action `send()`: trim the draft; if empty do nothing; else append it to messages and set draft "". Cell `chatView` renders messages as paragraphs, a text input (its input handler receives the typed string, wired to typeDraft, value = draft), and a button "send" (disabled when the trimmed draft is empty) wired to send.
Checker: call the input handler with " hi ", click "send", then call `send()` again -> `messages` ["hi"], `draft` "".

## 37 components (.tsx)
Data, in order: cards `{title, body, tag?}`: {"One","first", tag "new"}, {"Two","second"} (no tag). Define a reusable card component rendering a div with class "card" containing the bold title, a span with class "tag" holding the tag text only if there is a tag, and a paragraph with the body. Cell `board` renders a container with one card component per card.
Checker: `board` has 2 elements with class "card" and 1 with class "tag" whose text is "new".

## 38 shared-helpers (.ts)
Shared formatting helpers used by several cells: `pct(x)` = x*100 with 1 decimal and "%" (0.5 -> "50.0%"); `plural(n, word)` = "<n> <word>" with "s" appended unless n is 1; `clamp(x, lo, hi)`. Data: scores = [0.5, 0.9, 1.2, -0.1].
Cell `shown` = each score clamped to [0,1] then pct: ["50.0%","90.0%","100.0%","0.0%"]. Cell `summary` = plural(number of scores, "score") = "4 scores".

## 39 generic-groupby (.ts)
Write a reusable generic function groupBy(list, keyFunction) returning an object from key to list of items. Data, in order: sales `{region, amount}`: {"north",5}, {"south",7}, {"north",1} (region is "north" or "south").
Cell `byRegion` = sales grouped by region. Cell `northTotal` = sum of amounts in the north group, must equal 6.

## 40 generic-stack (.ts)
A generic immutable stack: operations empty(), push(stack, x), pop(stack) -> [top item, remaining stack], peek(stack), where a stack has an `items` list. Cell `demo`: start empty, push 1, 2, 3, pop it, then return `{top, peek, size}` = popped item, peek of the remaining stack, size of the remaining items. Must equal {top:3, peek:2, size:2} (keys in that order).
