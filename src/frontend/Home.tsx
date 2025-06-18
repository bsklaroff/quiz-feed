import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { CreateQuizReq, CreateQuizRes, GetQuizzesRes } from '../shared/api-types'
import LoadingDots from './LoadingDots'

function Home() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentQuizzes, setRecentQuizzes] = useState<GetQuizzesRes>([])
  const [quizzesLoading, setQuizzesLoading] = useState(true)

  useEffect(() => {
    const fetchRecentQuizzes = async () => {
      try {
        const response = await fetch('/api/quizzes')
        if (response.ok) {
          const quizzes = await response.json() as GetQuizzesRes
          setRecentQuizzes(quizzes)
        }
      } catch (err) {
        console.error('Failed to fetch recent quizzes:', err)
      } finally {
        setQuizzesLoading(false)
      }
    }

    void fetchRecentQuizzes()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/create_quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() } as CreateQuizReq),
      })

      if (!response.ok) {
        throw new Error('Failed to create quiz')
      }

      const data = await response.json() as CreateQuizRes
      await navigate(`/quiz/${data.quizId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Quiz Feed</h1>
          <p className="mt-2 text-gray-600">Enter a URL to create a quiz</p>
        </div>

        <form onSubmit={(x) => { void handleSubmit(x) }} className="space-y-4">
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <LoadingDots text="Creating Quiz" /> : 'Create Quiz'}
          </button>
        </form>

        {/* Recent Quizzes Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Quizzes</h2>
          {quizzesLoading ? (
            <div className="text-center text-gray-500">Loading recent quizzes...</div>
          ) : recentQuizzes.length === 0 ? (
            <div className="text-center text-gray-500">No quizzes created yet</div>
          ) : (
            <div className="space-y-3">
              {recentQuizzes.slice(0, 5).map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => { void navigate(`/quiz/${quiz.id}`) }}
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{quiz.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
