// A local source that answers later. Here the answer is the word's length, given at once.
const measure = () => (w: string): Promise<number> => Promise.resolve(w.length);

const word = (): StateCell<string> => state("soundscript");
const wordSize = (): StateCell<number> => state(0);

// A click asks; the async cell waits for the answer; the listener gives it to a synchronous action.
const measureAsked = (): StateCell<number> => state(0);
const measureWord = (measureAsked: State<number>) => action(() => measureAsked.update((n) => n + 1));
const measured = async (word: string, measureAsked: number, measure: (w: string) => Promise<number>) =>
  measureAsked === 0 ? null : await measure(word);
const wordSizes = function* (measured: number | null) {
  if (measured !== null) yield measured;
};
const storeSize = (wordSize: State<number>) => action((n: number) => wordSize.set(n));
const onSize = (wordSizes: Events<number>, storeSize: Action<[number]>) => on(wordSizes, storeSize);

const measureView = (word: string, wordSize: number, measureWord: Action<[]>) => (
  <div>
    <button onClick={measureWord}>measure</button> <output>{word} has {wordSize} letters</output>
  </div>
);
