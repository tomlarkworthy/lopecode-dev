type Form = { readonly email: string; readonly age: string };

const form = (): StateCell<Form> => state<Form>({ email: "", age: "" });

const setEmail = (form: State<Form>) => action((v: string) => form.update((f) => ({ ...f, email: v })));
const setAge = (form: State<Form>) => action((v: string) => form.update((f) => ({ ...f, age: v })));

const errors = (form: Form) => {
  const out: string[] = [];
  if (!form.email.includes("@")) out.push("email needs an @");
  const wholeNumber = /^[0-9]+$/.test(form.age);
  if (!wholeNumber || Number(form.age) > 150) out.push("age must be a whole number 0-150");
  return out;
};

const valid = (errors: readonly string[]) => errors.length === 0;

const formView = (form: Form, errors: readonly string[], valid: boolean, setEmail: Action<[string]>, setAge: Action<[string]>) => (
  <div>
    <label>
      email <input type="text" name="email" value={form.email} onInput={setEmail} />
    </label>
    <label>
      age <input type="number" name="age" min={0} max={150} value={form.age} onInput={setAge} />
    </label>
    {errors.map((e) => <p key={e}>{e}</p>)}
    <button disabled={!valid}>submit</button>
  </div>
);
