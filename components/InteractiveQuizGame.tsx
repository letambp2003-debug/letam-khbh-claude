'use client';

import { useState } from 'react';
import type { QuizPackage, QuizQuestion } from '@/types/extended';
import MathText from '@/components/MathText';

interface InteractiveQuizGameProps {
  quizPackage: QuizPackage;
}

export default function InteractiveQuizGame({ quizPackage }: InteractiveQuizGameProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [gameMode, setGameMode] = useState<'quiz' | 'wheel'>('quiz');

  // Trạng thái Vòng quay may mắn
  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<number | null>(null);

  const questions = quizPackage.questions || [];
  const currentQ: QuizQuestion | undefined = questions[currentIdx];

  function handleSelectOption(optionIndex: number) {
    if (selectedOption !== null || !currentQ) return;
    setSelectedOption(optionIndex);
    setShowAnswer(true);
    setAnsweredCount((prev) => prev + 1);

    if (optionIndex === currentQ.correctIndex) {
      setScore((prev) => prev + (currentQ.points || 10));
    }
  }

  function handleNext() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  }

  function handlePrev() {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      setSelectedOption(null);
      setShowAnswer(false);
    }
  }

  function handleReset() {
    setCurrentIdx(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setScore(0);
    setAnsweredCount(0);
  }

  function spinWheel() {
    if (wheelSpinning || questions.length === 0) return;
    setWheelSpinning(true);
    setWheelResult(null);

    const randomIdx = Math.floor(Math.random() * questions.length);
    setTimeout(() => {
      setWheelSpinning(false);
      setWheelResult(randomIdx);
      setCurrentIdx(randomIdx);
      setSelectedOption(null);
      setShowAnswer(false);
    }, 2000);
  }

  if (questions.length === 0) {
    return <div className="muted">Chưa có câu hỏi nào trong ngân hàng.</div>;
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div>
      {/* Thanh công cụ trò chơi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1a365d',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 8,
          marginBottom: 16
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>🎯 {quizPackage.lessonTitle}</span>
          <span
            style={{
              background: '#2b6cb0',
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 12
            }}
          >
            {questions.length} câu hỏi
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f6ad55' }}>⭐ Điểm số: {score} đ</div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn"
              style={{
                background: gameMode === 'quiz' ? '#3182ce' : '#2d3748',
                color: '#fff',
                fontSize: 12,
                padding: '6px 12px'
              }}
              onClick={() => setGameMode('quiz')}
            >
              📝 Trắc nghiệm lớp học
            </button>
            <button
              className="btn"
              style={{
                background: gameMode === 'wheel' ? '#3182ce' : '#2d3748',
                color: '#fff',
                fontSize: 12,
                padding: '6px 12px'
              }}
              onClick={() => setGameMode('wheel')}
            >
              🎡 Vòng quay bốc thăm
            </button>
          </div>
        </div>
      </div>

      {gameMode === 'wheel' && (
        <div
          style={{
            background: '#fff',
            border: '2px dashed #3182ce',
            borderRadius: 10,
            padding: 24,
            textAlign: 'center',
            marginBottom: 20
          }}
        >
          <h3 style={{ color: '#2b6cb0', margin: '0 0 10px 0' }}>🎡 VÒNG QUAY BỐC THĂM CÂU HỎI &amp; GỌI HỌC SINH</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
            Bấm "Quay ngẫu nhiên" để hệ thống tự động bốc câu hỏi bất ngờ cho cả lớp cùng tham gia!
          </p>

          <button
            className="btn btn-primary"
            disabled={wheelSpinning}
            style={{
              fontSize: 18,
              padding: '12px 30px',
              background: wheelSpinning ? '#a0aec0' : '#dd6b20'
            }}
            onClick={spinWheel}
          >
            {wheelSpinning ? '🌀 Đang quay...' : '🎲 QUAY NGẪU NHIÊN'}
          </button>

          {wheelResult !== null && (
            <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: '#276749' }}>
              🎉 Đã bốc thăm trúng <strong>Câu hỏi số {wheelResult + 1}</strong>! Xem câu hỏi bên dưới:
            </div>
          )}
        </div>
      )}

      {/* Khung hiển thị câu hỏi trắc nghiệm */}
      {currentQ && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #cbd5e0',
            borderRadius: 10,
            padding: 24,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}
        >
          {/* Header câu hỏi */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 12,
              marginBottom: 16
            }}
          >
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#1a365d' }}>
                CÂU HỎI {currentIdx + 1} / {questions.length}
              </span>
              <span
                style={{
                  background:
                    currentQ.level === 'Nhận biết'
                      ? '#c6f6d5'
                      : currentQ.level === 'Thông hiểu'
                      ? '#bee3f8'
                      : currentQ.level === 'Vận dụng'
                      ? '#feebc8'
                      : '#fed7d7',
                  color:
                    currentQ.level === 'Nhận biết'
                      ? '#22543d'
                      : currentQ.level === 'Thông hiểu'
                      ? '#2b6cb0'
                      : currentQ.level === 'Vận dụng'
                      ? '#c05621'
                      : '#9b2c2c',
                  padding: '2px 10px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Mức độ: {currentQ.level}
              </span>
            </div>

            <span className="muted" style={{ fontSize: 13 }}>
              +{currentQ.points || 10} điểm
            </span>
          </div>

          {/* Nội dung câu hỏi (chữ to, dễ đọc trên máy chiếu) */}
          <div style={{ fontSize: 17, color: '#2d3748', marginBottom: 24, lineHeight: 1.6 }}>
            <MathText text={currentQ.question} />
          </div>

          {/* 4 Lựa chọn A, B, C, D */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = selectedOption === oIdx;
              const isCorrect = currentQ.correctIndex === oIdx;

              let bg = '#f8fafc';
              let borderColor = '#e2e8f0';
              let textColor = '#2d3748';

              if (showAnswer) {
                if (isCorrect) {
                  bg = '#c6f6d5';
                  borderColor = '#38a169';
                  textColor = '#22543d';
                } else if (isSelected) {
                  bg = '#fed7d7';
                  borderColor = '#e53e3e';
                  textColor = '#9b2c2c';
                }
              } else if (isSelected) {
                bg = '#ebf8ff';
                borderColor = '#3182ce';
              }

              return (
                <div
                  key={oIdx}
                  onClick={() => handleSelectOption(oIdx)}
                  style={{
                    border: `2px solid ${borderColor}`,
                    background: bg,
                    color: textColor,
                    padding: '14px 18px',
                    borderRadius: 8,
                    cursor: selectedOption === null ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 16,
                    fontWeight: 500,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: showAnswer && isCorrect ? '#38a169' : '#e2e8f0',
                      color: showAnswer && isCorrect ? '#fff' : '#1a202c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0
                    }}
                  >
                    {optionLabels[oIdx]}
                  </span>
                  <div style={{ flex: 1 }}>
                    <MathText text={opt} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Giải thích chi tiết khi đã chọn đáp án */}
          {showAnswer && (
            <div
              style={{
                marginTop: 24,
                background: selectedOption === currentQ.correctIndex ? '#f0fff4' : '#fffaf0',
                border: `1px solid ${selectedOption === currentQ.correctIndex ? '#9ae6b4' : '#fbd38d'}`,
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>
                  {selectedOption === currentQ.correctIndex ? '✅ CHÍNH XÁC!' : '❌ CHƯA CHÍNH XÁC!'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  Đáp án đúng là: <strong>{optionLabels[currentQ.correctIndex]}</strong>
                </span>
              </div>
              <div style={{ color: '#4a5568', fontSize: 14 }}>
                <strong>Lời giải chi tiết: </strong>
                <MathText text={currentQ.explanation} />
              </div>
            </div>
          )}

          {/* Điều hướng câu hỏi */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              borderTop: '1px solid #edf2f7',
              paddingTop: 16
            }}
          >
            <button className="btn btn-secondary" disabled={currentIdx === 0} onClick={handlePrev}>
              ← Câu trước
            </button>

            <button className="btn btn-secondary" onClick={handleReset}>
              ↺ Bắt đầu lại
            </button>

            <button
              className="btn btn-primary"
              disabled={currentIdx === questions.length - 1}
              onClick={handleNext}
            >
              Câu tiếp theo →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
