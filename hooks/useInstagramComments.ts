'use client'

import { useState, useCallback } from 'react'

export interface InstagramComment {
  id: string
  clientId: string
  mediaId: string
  commentId: string
  username: string
  text: string
  timestamp: string
  likeCount: number
  hidden: boolean
  parentId: string | null
  createdAt: string
  updatedAt: string
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; comments: InstagramComment[] }
  | { status: 'error'; message: string }

type ReplyState = 'idle' | 'loading' | 'error'
type HideState  = 'idle' | 'loading' | 'error'

export function useInstagramComments() {
  const [state, setState] = useState<FetchState>({ status: 'idle' })
  const [currentMediaId, setCurrentMediaId] = useState<string | null>(null)
  const [replyState, setReplyState] = useState<ReplyState>('idle')
  const [hideState, setHideState] = useState<HideState>('idle')

  const fetchComments = useCallback(async (mediaId: string) => {
    setState({ status: 'loading' })
    setCurrentMediaId(mediaId)
    try {
      const res = await fetch(`/api/instagram/comments?mediaId=${encodeURIComponent(mediaId)}`)
      const json = await res.json()
      if (!res.ok) {
        setState({ status: 'error', message: json.error ?? 'Error desconocido' })
        return
      }
      setState({ status: 'ok', comments: json.comments as InstagramComment[] })
    } catch (e) {
      setState({ status: 'error', message: String(e) })
    }
  }, [])

  const postReply = useCallback(async (commentId: string, message: string): Promise<boolean> => {
    setReplyState('loading')
    try {
      const res = await fetch('/api/instagram/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, message }),
      })
      const json = await res.json()
      if (!res.ok) {
        setReplyState('error')
        return false
      }
      const newComment = json.comment as InstagramComment
      setState(prev =>
        prev.status === 'ok'
          ? { ...prev, comments: [...prev.comments, newComment] }
          : prev
      )
      setReplyState('idle')
      return true
    } catch {
      setReplyState('error')
      return false
    }
  }, [])

  const hideComment = useCallback(async (id: string): Promise<boolean> => {
    setHideState('loading')
    try {
      const res = await fetch(`/api/instagram/comments/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        setHideState('error')
        return false
      }
      setState(prev =>
        prev.status === 'ok'
          ? { ...prev, comments: prev.comments.map(c => c.id === id ? { ...c, hidden: true } : c) }
          : prev
      )
      setHideState('idle')
      return true
    } catch {
      setHideState('error')
      return false
    }
  }, [])

  return {
    state,
    currentMediaId,
    replyState,
    hideState,
    fetchComments,
    postReply,
    hideComment,
  }
}
