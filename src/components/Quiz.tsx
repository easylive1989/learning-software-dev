import { useState } from 'react';
import './widgets.css';

export type Question = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

function QuizItem({ item, index }: { item: Question; index: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === item.answer;

  return (
    <fieldset className="quiz-item">
      <legend>
        <span className="quiz-no">{index + 1}.</span> {item.q}
      </legend>
      <div className="quiz-options">
        {item.options.map((opt, i) => {
          let state = '';
          if (answered && i === item.answer) state = 'is-answer';
          else if (answered && i === picked) state = 'is-wrong';
          return (
            <button
              key={i}
              type="button"
              className={`quiz-option ${state}`}
              onClick={() => setPicked(i)}
              disabled={answered}
              aria-pressed={picked === i}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`quiz-feedback ${correct ? 'ok' : 'bad'}`} role="status">
          <strong>{correct ? '答對了。' : '不太對。'}</strong> {item.explain}
          {!correct && (
            <button type="button" className="quiz-retry" onClick={() => setPicked(null)}>
              再選一次
            </button>
          )}
        </div>
      )}
    </fieldset>
  );
}

export default function Quiz({ questions }: { questions: Question[] }) {
  return (
    <div className="quiz">
      {questions.map((q, i) => (
        <QuizItem key={i} item={q} index={i} />
      ))}
    </div>
  );
}
