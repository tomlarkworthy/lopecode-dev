const s2_base = () => 21;

const s2_double = () => (n: number) => n * 2;

const s2_answer = (s2_base, s2_double) => s2_double(s2_base);

const s2_later = async (s2_answer: number) => s2_answer + 1;

const s2_word = function* () { yield "tea"; };

const s2_counter = () => state(3);

const s2_read = (s2_later: number, s2_word: string, s2_counter: number) => [s2_later, s2_word, s2_counter];

const s2_shadow = () => { const s2_base = 2; return s2_base; };

const s2_caught = () => {
  const caught = (k: number): string => {
    try {
      if (k === 0) throw new Error("boom");
      if (k === 1) throw "plain";
      throw 7;
    } catch (e) {
      return messageOf(e);
    }
  };
  return [caught(0), caught(1), caught(2)];
};
