import _ from 'lodash'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router'
import { GetQuizRes, EditQuizRes, PublishQuizReq, PublishQuizRes, QuizItem } from '../shared/api-types'
import LoadingDots from './LoadingDots'

interface QuizResponse {
  selectedOption: number | null
  isCorrect: boolean | null
}

function randomizeQuizOptions(items: QuizItem[]): void {
  items.forEach(item => {
    const optionsWithIndex = item.options.map((option, index) => ({ option, originalIndex: index }))
    const shuffledOptions = _.shuffle(optionsWithIndex)
    item.options = shuffledOptions.map(option => option.option)
    item.correctOption = shuffledOptions.findIndex(option => option.originalIndex === item.correctOption)
  })
}

function Quiz() {
  const { quizSlug } = useParams<{ quizSlug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<GetQuizRes | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [showResults, setShowResults] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'replace' | 'publish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [scheduledForDeletion, setScheduledForDeletion] = useState<Set<number>>(new Set())
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set())

  const reloadQuiz = useCallback((quizSlug: string) => {
    fetch(`/api/quiz/${quizSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Quiz not found')
        return res.json()
      })
      .then((data: GetQuizRes) => {
        randomizeQuizOptions(data.items)
        setQuiz(data)
        setResponses(new Array(data.items.length).fill({ selectedOption: null, isCorrect: null }))
        setScheduledForDeletion(new Set())
        setAdditionalInstructions('')
        setRevealedAnswers(new Set())
        setInitialLoading(false)
        // Set initial URL parameter if none exists
        if (!searchParams.get('q') && !searchParams.get('results')) {
          setSearchParams({ q: '1' })
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setInitialLoading(false)
      })
  }, [searchParams, setSearchParams])

  // Initial quiz load
  useEffect(() => {
    if (!quizSlug || quiz?.slug === quizSlug) return
    reloadQuiz(quizSlug)
  }, [quizSlug, quiz, reloadQuiz])

  // Sync state with URL parameters
  useEffect(() => {
    if (!quiz) return

    const questionParam = searchParams.get('q')
    const resultsParam = searchParams.get('results')

    if (resultsParam === 'true') {
      setShowResults(true)
    } else if (questionParam) {
      const questionNumber = parseInt(questionParam, 10)
      if (questionNumber >= 1 && questionNumber <= quiz.items.length) {
        setCurrentQuestion(questionNumber - 1)
        setShowResults(false)
      } else {
        setSearchParams({ q: '1' })
      }
    }
  }, [quiz, searchParams, setSearchParams])

  // Scroll to top when navigation params change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [searchParams])

  const handleOptionSelect = (optionIndex: number) => {
    if (!quiz || showResults) return

    const isCorrect = optionIndex === quiz.items[currentQuestion].correctOption
    const newResponses = [...responses]
    newResponses[currentQuestion] = { selectedOption: optionIndex, isCorrect }
    setResponses(newResponses)

    // Smooth scroll to ensure the entire question is visible
    setTimeout(() => {
      const questionContainer = document.getElementById('question-container')
      if (questionContainer) {
        const rect = questionContainer.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        // Check if the entire question is visible
        if (rect.top < 0 || rect.bottom > viewportHeight) {
          // Scroll to show the question with some padding from the top
          const scrollTop = window.pageYOffset + rect.top - 20
          window.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth',
          })
        }
      }
    }, 100)
  }

  const nextQuestion = () => {
    if (currentQuestion < quiz!.items.length - 1) {
      const nextQ = currentQuestion + 1
      setSearchParams({ q: (nextQ + 1).toString() })
    } else {
      setSearchParams({ results: 'true' })
    }
  }

  const restartQuiz = () => {
    randomizeQuizOptions(quiz!.items)
    setResponses(new Array(quiz!.items.length).fill({ selectedOption: null, isCorrect: null }))
    setScheduledForDeletion(new Set())
    setAdditionalInstructions('')
    setRevealedAnswers(new Set())
    setSearchParams({ q: '1' })
  }

  const toggleDeletion = (index: number) => {
    const newScheduled = new Set(scheduledForDeletion)
    if (newScheduled.has(index)) {
      newScheduled.delete(index)
    } else {
      newScheduled.add(index)
    }
    setScheduledForDeletion(newScheduled)
  }

  const revealAnswer = (index: number) => {
    const newRevealed = new Set(revealedAnswers)
    newRevealed.add(index)
    setRevealedAnswers(newRevealed)
  }

  const replaceSelectedQuestions = async () => {
    if (!quiz || scheduledForDeletion.size === 0) return

    try {
      setActionLoading('replace')
      setActionError(null)
      const response = await fetch(`/api/edit_quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.id,
          deletedItemIdxs: Array.from(scheduledForDeletion),
          additionalInstructions: additionalInstructions.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json() as EditQuizRes
        await navigate(`/quiz/${data.quizSlug}?results=true`)
      } else {
        const errorData = await response.json().catch(() => null) as { error?: string } | null
        setActionError(errorData?.error || 'Failed to update quiz')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  const togglePublish = async () => {
    if (!quiz) return

    try {
      setActionLoading('publish')
      setActionError(null)
      const response = await fetch(`/api/toggle_publish_quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: quiz.id,
        } as PublishQuizReq),
      })

      if (response.ok) {
        const data = await response.json() as PublishQuizRes
        setQuiz(prev => prev ? { ...prev, publishedAt: data.publishedAt } : null)
      } else {
        const errorData = await response.json().catch(() => null) as { error?: string } | null
        setActionError(errorData?.error || 'Failed to publish/unpublish quiz')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setActionLoading(null)
    }
  }

  if (initialLoading) return <div className="flex items-center justify-center min-h-screen text-lg">Loading quiz...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">Error: {error}</div>
  if (!quiz) return <div className="flex items-center justify-center min-h-screen text-red-600">Quiz not found</div>

  const currentItem = quiz.items[currentQuestion]
  const currentResponse = responses[currentQuestion]
  const score = responses.filter(r => r.isCorrect).length

  if (showResults) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl mb-4">{quiz.title}</h1>
          <div className="text-2xl font-semibold text-blue-600">
            Score: {score} / {quiz.items.length} ({Math.round((score / quiz.items.length) * 100)}%)
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {quiz.items.map((item, index) => {
            const isScheduledForDeletion = scheduledForDeletion.has(index)
            const isAnswered = responses[index].selectedOption !== null
            const isRevealed = revealedAnswers.has(index)
            const showAnswer = isAnswered || isRevealed

            return (
              <div key={index} className={`border rounded-lg p-6 relative ${
                isScheduledForDeletion
                  ? 'border-red-500 bg-red-100'
                  : isAnswered
                    ? responses[index].isCorrect
                      ? 'border-green-300 bg-green-50'
                      : 'border-red-300 bg-red-50'
                    : 'border-gray-300 bg-gray-50'
              }`}>
                <button
                  onClick={() => toggleDeletion(index)}
                  className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors cursor-pointer ${
                    isScheduledForDeletion
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-600 hover:bg-red-200 hover:text-red-600'
                  }`}
                  title={isScheduledForDeletion ? 'Unschedule for deletion' : 'Schedule for deletion'}
                >
                  ×
                </button>
                <h3 className={`font-semibold text-lg mb-3 ${isScheduledForDeletion ? 'line-through' : ''}`}>
                  Question {index + 1} {!isAnswered && <span className="text-sm font-normal text-gray-500">(Not answered)</span>}
                </h3>
                <p className={`mb-4 text-gray-800 ${isScheduledForDeletion ? 'line-through' : ''}`}>
                  {item.stem}
                </p>
                <div className="space-y-2 mb-4">
                  {item.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className={`p-3 rounded border ${
                        showAnswer && optionIndex === item.correctOption
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : showAnswer && optionIndex === responses[index].selectedOption
                          ? 'border-red-500 bg-red-100 text-red-800'
                          : 'border-gray-200 bg-white'
                      } ${isScheduledForDeletion ? 'line-through' : ''}`}
                    >
                      {option}
                    </div>
                  ))}
                </div>
                {showAnswer ? (
                  <div className={`text-sm text-gray-600 bg-gray-100 p-3 rounded ${isScheduledForDeletion ? 'line-through' : ''}`}>
                    <strong>Source:</strong> &quot;{item.sourceSnippet}&quot;
                  <a
                    href={quiz.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors no-underline ml-1 cursor-pointer"
                  >
                    {quiz.source.favicon && <img src={quiz.source.favicon} alt="" className="w-3 h-3" />}
                    {quiz.source.title}
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <button
                      onClick={() => revealAnswer(index)}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors cursor-pointer"
                    >
                      View Answer
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {scheduledForDeletion.size > 0 && (
          <div className="mb-6">
            <label htmlFor="additional-instructions" className="block text-sm font-medium text-gray-700 mb-2">
              Additional instructions for replacement questions (optional):
            </label>
            <textarea
              id="additional-instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="e.g. Focus more on..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
              rows={3}
            />
          </div>
        )}

        <div className="flex flex-col justify-center items-center gap-4">
          {actionError && (
            <div className="text-red-600 text-sm text-center">
              {actionError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={scheduledForDeletion.size > 0 ? replaceSelectedQuestions : restartQuiz}
              disabled={actionLoading !== null}
              className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg transition-colors ${
                actionLoading !== null
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : scheduledForDeletion.size > 0
                    ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                    : 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              }`}
            >
              {actionLoading === 'replace' ? <LoadingDots text="Loading" /> : scheduledForDeletion.size > 0 ? 'Replace Selected Questions' : 'Restart Quiz'}
            </button>
            <button
              onClick={() => { void togglePublish() }}
              disabled={actionLoading !== null}
              className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg transition-colors ${
                actionLoading !== null
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : quiz.publishedAt
                    ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                    : 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
              }`}
            >
              {quiz.publishedAt ? 'Unpublish from Home Page' : 'Publish to Home Page'}
            </button>
            <button
              onClick={() => { void navigate('/') }}
              className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Go to Home Page
            </button>
          </div>
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

      <div id="question-container" className="bg-white border rounded-lg p-6 shadow-sm">
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
                  : currentResponse.selectedOption !== null
                  ? 'border-gray-200 bg-white cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
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
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors no-underline ml-1 cursor-pointer"
              >
{quiz.source.favicon && <img src={quiz.source.favicon} alt="" className="w-3 h-3" />}
                {quiz.source.title}
              </a>
            </div>
            <button
              onClick={nextQuestion}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors cursor-pointer"
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
