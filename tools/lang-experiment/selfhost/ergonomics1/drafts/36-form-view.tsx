const draft = (): StateCell<string> => state("");
const messages = (): StateCell<string[]> => state<string[]>([]);
const typeDraft = (draft: State<string>) => action((s: string) => draft.set(s));
const send = (draft: State<string>, messages: State<string[]>) =>
  action(() => {
    const text = read(draft).trim();
    if (text === "") return;
    messages.update((ms) => [...ms, text]);
    draft.set("");
  });
const chatView = (draft: string, messages: string[], typeDraft: Action<[string]>, send: Action<[]>) => (
  <div>
    {messages.map((m, i) => <p key={i}>{m}</p>)}
    <input type="text" value={draft} onInput={typeDraft} />
    <button onClick={send} disabled={draft.trim() === ""}>send</button>
  </div>
);
