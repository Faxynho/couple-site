"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { QuizAnswerRecord, QuizMode, QuizQuestion } from "@/lib/quizTypes";

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuizQuestionCardProps {
  question: QuizQuestion;
  /** Resposta final CONFIRMADA — individual no Solo/Duelo; da dupla (a mesma
   *  para os dois) no modo "Juntos", só depois que os dois baterem a mesma alternativa. */
  ownAnswer: QuizAnswerRecord | null;
  revealed: boolean;
  onAnswer: (optionIndex: number) => void;
  mode: QuizMode;
  /** Só no Duelo: nome e resposta do adversário na pergunta atual. */
  opponent?: { name: string; answer: QuizAnswerRecord | null } | null;
  /** Só no "Juntos": em qual alternativa cada um está com o dedo em cima
   *  AGORA, antes de confirmar — pra ajudar a bater a resposta com o par. */
  together?: { selfPick: number | null; partnerPick: number | null; partnerName: string | null } | null;
}

export default function QuizQuestionCard({
  question,
  ownAnswer,
  revealed,
  onAnswer,
  mode,
  opponent,
  together,
}: QuizQuestionCardProps) {
  const isTogether = mode === "together";
  // No "Juntos" dá pra trocar de escolha livremente até os dois combinarem —
  // só trava de fato depois que a resposta é confirmada (revealed).
  const locked = isTogether ? revealed : Boolean(ownAnswer) || revealed;
  const missedQuestion = !isTogether && revealed && !ownAnswer;

  const selfPick = isTogether ? together?.selfPick ?? null : ownAnswer?.optionIndex ?? null;
  const partnerPick = isTogether && !revealed ? together?.partnerPick ?? null : null;

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel w-full max-w-[min(94vw,560px)] rounded-xl3 p-5 sm:p-6"
    >
      <span className="inline-flex items-center rounded-full bg-surface/70 px-3 py-1 text-xs font-medium text-ink-soft">
        {question.category}
      </span>

      <h2 className="mt-3 font-display text-lg font-semibold leading-snug text-ink sm:text-xl">
        {question.question}
      </h2>

      <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const isChosen = revealed ? ownAnswer?.optionIndex === index : selfPick === index;
          const isPartnerPick = partnerPick === index && partnerPick !== selfPick;
          const isCorrectOption = revealed && question.correctIndex === index;
          const isWrongChoice = revealed && isChosen && !isCorrectOption;

          let stateClasses = "border-surface/70 bg-surface/60 text-ink hover:bg-surface/85";
          if (isCorrectOption) stateClasses = "border-sage bg-sage/40 text-ink";
          else if (isWrongChoice) stateClasses = "border-rose-deep bg-rose/20 text-ink";
          else if (isChosen) stateClasses = "border-rose bg-rose/10 text-ink";
          else if (isPartnerPick) stateClasses = "border-dashed border-ink-soft/50 bg-surface/60 text-ink";

          return (
            <button
              key={index}
              onClick={() => !locked && onAnswer(index)}
              disabled={locked}
              className={`flex items-center gap-3 rounded-xl2 border px-4 py-3.5 text-left text-sm font-medium transition-colors disabled:cursor-default sm:text-base ${stateClasses}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface/70 text-xs font-semibold text-ink-soft">
                {OPTION_LETTERS[index]}
              </span>
              <span className="flex-1">{option}</span>
              {isPartnerPick && (
                <span className="shrink-0 text-xs text-ink-soft">👉 {together?.partnerName}</span>
              )}
              {isCorrectOption && <Check size={18} className="shrink-0 text-ink" />}
              {isWrongChoice && <X size={18} className="shrink-0 text-rose-deep" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isTogether && !revealed && (selfPick !== null || partnerPick !== null) && (
          <motion.p
            key="together-status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-xs text-ink-soft"
          >
            {selfPick !== null && partnerPick !== null
              ? "Alternativas diferentes — cliquem na mesma para confirmar."
              : selfPick !== null
              ? `Você escolheu — esperando ${together?.partnerName ?? "o par"} escolher.`
              : `${together?.partnerName ?? "Seu par"} escolheu — clique na mesma alternativa para confirmar.`}
          </motion.p>
        )}
        {!isTogether && ownAnswer && !revealed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center text-xs text-ink-soft"
          >
            Resposta enviada — aguardando a pergunta terminar...
          </motion.p>
        )}
        {revealed && question.explanation && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl2 bg-surface/60 px-4 py-3 text-sm text-ink-soft"
          >
            💡 {question.explanation}
          </motion.p>
        )}
        {missedQuestion && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center text-xs text-ink-soft">
            Você não respondeu a tempo.
          </motion.p>
        )}
        {revealed && opponent && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-center text-xs text-ink-soft"
          >
            {!opponent.answer || opponent.answer.optionIndex === null
              ? `${opponent.name} não respondeu a tempo.`
              : opponent.answer.correct
              ? `${opponent.name} acertou! ✅`
              : `${opponent.name} errou. ❌`}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
