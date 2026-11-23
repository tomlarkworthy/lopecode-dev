const v = (): StateCell<number> => state(0);
const later = (v: State<number>) =>
  action(() => {
    Promise.resolve().then(() => v.set(1));
  });
