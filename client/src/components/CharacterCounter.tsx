type CharacterCounterProps = {
  current: number;
  max: number;
};

const CharacterCounter = ({ current, max }: CharacterCounterProps) => (
  <p className="mt-1 text-xs text-slate-500 text-right">
    {current} / {max}
  </p>
);

export default CharacterCounter;
