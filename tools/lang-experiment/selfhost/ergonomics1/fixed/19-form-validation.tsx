type Form = { email: string; age: string };
const form = (): StateCell<Form> => state({ email: "", age: "" });
const setEmail = (form: State<Form>) => action((v: string) => form.update((f) => ({ ...f, email: v })));
const setAge = (form: State<Form>) => action((v: string) => form.update((f) => ({ ...f, age: v })));
const errors = (form: Form) => {
  const errs: string[] = [];
  if (!form.email.includes("@")) errs.push("email needs an @");
  const n = Number(form.age);
  if (!Number.isInteger(n) || n < 0 || n > 150) errs.push("age must be a whole number 0-150");
  return errs;
};
const valid = (errors: string[]) => errors.length === 0;
const formView = (form: Form, errors: string[], valid: boolean, setEmail: Action<[string]>, setAge: Action<[string]>) => (
  <div>
    <input type="text" value={form.email} onInput={setEmail} />
    <input type="number" value={form.age} onInput={setAge} />
    {errors.map((e) => <p class="err">{e}</p>)}
    <button disabled={!valid}>submit</button>
  </div>
);
