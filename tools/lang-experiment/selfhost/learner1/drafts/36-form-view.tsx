const draft = (): StateCell<string> => state("");
const messages = (): StateCell<readonly string[]> => state<readonly string[]>([]);

const typeDraft = (draft: State<string>) => action((s: string) => draft.set(s));

const send = (draft: State<string>, messages: State<readonly string[]>) =>
  action(() => {
    const text = read(draft).trim();
    if (text === "") return;
    messages.update((m) => [...m, text]);
    draft.set("");
  });

const chatView = (draft: string, messages: readonly string[], typeDraft: Action<[string]>, send: Action<[]>) => (
  <div>
    {messages.map((m, i) => <p key={i}>{m}</p>)}
    <input type="text" value={draft} onInput={typeDraft} />
    <button onClick={send} disabled={draft.trim() === ""}>send</button>
  </div>
);
