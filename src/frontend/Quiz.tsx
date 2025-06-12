import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { Quiz as QuizType } from '../db/schema'

interface QuizWithSource extends QuizType {
  source: {
    url: string
    title: string
    favicon: string
  }
}

interface QuizResponse {
  selectedOption: number | null
  isCorrect: boolean | null
}

function Quiz() {
  const { quizId } = useParams<{ quizId: string }>()
  const [quiz, setQuiz] = useState<QuizWithSource | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!quizId) return

    fetch(`/api/quiz/${quizId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Quiz not found')
        return res.json()
      })
      .then((data: QuizWithSource) => {
        setQuiz(data)
        setResponses(new Array(data.items.length).fill({ selectedOption: null, isCorrect: null }))
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      })
  }, [quizId])

  const handleOptionSelect = (optionIndex: number) => {
    if (!quiz || showResults) return

    const isCorrect = optionIndex === quiz.items[currentQuestion].correctOption
    const newResponses = [...responses]
    newResponses[currentQuestion] = { selectedOption: optionIndex, isCorrect }
    setResponses(newResponses)
  }

  const nextQuestion = () => {
    if (currentQuestion < quiz!.items.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      setShowResults(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setResponses(new Array(quiz!.items.length).fill({ selectedOption: null, isCorrect: null }))
    setShowResults(false)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading quiz...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Error: {error}</div>
  if (!quiz) return <div className="flex items-center justify-center min-h-screen text-red-600">Quiz not found</div>

  const currentItem = quiz.items[currentQuestion]
  const currentResponse = responses[currentQuestion]
  const score = responses.filter(r => r.isCorrect).length

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Quiz Complete!</h1>
          <div className="text-2xl font-semibold text-blue-600">
            Score: {score} / {quiz.items.length} ({Math.round((score / quiz.items.length) * 100)}%)
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {quiz.items.map((item, index) => (
            <div key={index} className={`border rounded-lg p-6 ${responses[index].isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <h3 className="font-semibold text-lg mb-3">Question {index + 1}</h3>
              <p className="mb-4 text-gray-800">{item.stem}</p>
              <div className="space-y-2 mb-4">
                {item.options.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    className={`p-3 rounded border ${
                      optionIndex === item.correctOption
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : optionIndex === responses[index].selectedOption
                        ? 'border-red-500 bg-red-100 text-red-800'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
                <strong>Source:</strong> &quot;{item.sourceSnippet}&quot;
                <a
                  href={quiz.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors no-underline ml-1"
                >
                  <img src={quiz.source.favicon} alt="" className="w-3 h-3" />
                  {quiz.source.title}
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={restartQuiz}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
        <div className="text-gray-600">
          Question {currentQuestion + 1} of {quiz.items.length}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.items.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6">{currentItem.stem}</h2>

        <div className="space-y-3 mb-6">
          {currentItem.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionSelect(index)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                currentResponse.selectedOption === index
                  ? currentResponse.isCorrect
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-red-500 bg-red-50 text-red-800'
                  : currentResponse.selectedOption !== null && index === currentItem.correctOption
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
              disabled={currentResponse.selectedOption !== null}
            >
              {option}
            </button>
          ))}
        </div>

        {currentResponse.selectedOption !== null && (
          <div className="border-t pt-6">
            <div className={`text-lg font-semibold mb-3 ${currentResponse.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {currentResponse.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 p-3 rounded mb-4">
              <strong>Source:</strong> &quot;{currentItem.sourceSnippet}&quot;
              <a
                href={quiz.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors no-underline ml-1"
              >
                <img src={quiz.source.favicon} alt="" className="w-3 h-3" />
                {quiz.source.title}
              </a>
            </div>
            <button
              onClick={nextQuestion}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              {currentQuestion === quiz.items.length - 1 ? 'View Results' : 'Next Question'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Quiz
