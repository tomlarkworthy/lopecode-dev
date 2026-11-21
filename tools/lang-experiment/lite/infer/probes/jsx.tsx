// JSX attributes with no value (typed tree gap fixed 2026-11-21): true, checked against the attribute's type
export const jxBare = () => <input disabled />;
export const jxBareButton = () => <button disabled>go</button>;
export const jxBareWrong = () => <input value />;
export const jxBareUnknown = () => <input nosuch />;
export const jxBareMixed = () => <input disabled type="text" min={1} />;
export const jxBareComp = (jxBare) => <div>{jxBare}<span hidden /></div>;
