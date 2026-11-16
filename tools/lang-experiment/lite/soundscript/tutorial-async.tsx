// A local source that answers later. Here the answer is the word's length, given at once.
const measure = () => (w: string): Promise<number> => Promise.resolve(w.length);

const word = (): StateCell<string> => state("soundscript");
const wordSize = (): StateCell<number> => state(0);

// The action waits for the answer, then writes it. The write commits when the call finishes.
const measureWord = (word: State<string>, wordSize: State<number>, measure: (w: string) => Promise<number>) =>
  action(async () => {
    const n = await measure(read(word));
    wordSize.set(n);
  });

const measureView = (word: string, wordSize: number, measureWord: Action<[]>) => (
  <div>
    <button onClick={measureWord}>measure</button> <output>{word} has {wordSize} letters</output>
  </div>
);
