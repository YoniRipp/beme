import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Loader2, Mic, CheckCircle2, AlertCircle, MoreVertical, Trash2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgent } from '@/hooks/useAgent';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { cn } from '@/lib/utils';
import type { AgentResponse } from '@/core/api/chat';

function isRTL(text: string): boolean {
  return /[\u0590-\u05FF\uFB1D-\uFB4F]/.test(text);
}

interface ChatAgentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatAgentPanel({ open, onOpenChange }: ChatAgentPanelProps) {
  const { messages, isLoadingHistory, isSending, isThinking, streamingContent, sendMessage, clearHistory } = useAgent();
  const [input, setInput] = useState('');
  const [lastActions, setLastActions] = useState<AgentResponse['actions'] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    isAvailable: voiceAvailable,
    isListening,
    startListening,
    stopListening,
    currentTranscript,
  } = useSpeechRecognition();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setLastActions(null);
    const result = await sendMessage(text);
    if (result?.actions?.length) {
      setLastActions(result.actions);
    }
  }, [input, isSending, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleVoice = useCallback(async () => {
    if (isListening) {
      await stopListening();
      if (currentTranscript) {
        setInput(currentTranscript);
      }
      return;
    }
    if (voiceAvailable) {
      await startListening();
    }
  }, [isListening, voiceAvailable, startListening, stopListening, currentTranscript]);

  const handleClearHistory = useCallback(async () => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      await clearHistory();
      setLastActions(null);
    }
  }, [clearHistory]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex h-[85vh] flex-col rounded-t-2xl p-0"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-0">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header: X left, title center, overflow right */}
        <div className="flex items-center px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>

          <h2 className="flex-1 text-center text-base font-semibold">AI Coach</h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="Chat options"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleClearHistory}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Divider */}
        <div className="border-b" />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoadingHistory && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingHistory && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p className="text-sm">Ask me anything about your fitness data,</p>
              <p className="text-sm">or tell me to take an action.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  'How many workouts this week?',
                  'Copy today\'s meals to tomorrow',
                  'Write me a workout plan',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const rtl = isRTL(msg.content);
            return (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'mr-auto bg-muted'
                )}
                dir={rtl ? 'rtl' : 'ltr'}
              >
                <p className={cn('whitespace-pre-wrap', rtl && 'text-right')}>{msg.content}</p>
              </div>
            );
          })}

          {/* Action results */}
          {lastActions && lastActions.length > 0 && (
            <div className="mr-auto max-w-[85%] space-y-1">
              {lastActions.map((action: AgentResponse['actions'][number], i: number) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs',
                    action.success
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                  )}
                >
                  {action.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{action.message || action.intent}</span>
                </div>
              ))}
            </div>
          )}

          {/* Thinking indicator (tool calls in progress) */}
          {isSending && isThinking && !streamingContent && (
            <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Streaming message (real-time text) */}
          {isSending && streamingContent && (
            <div
              className="mr-auto max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed"
              dir={isRTL(streamingContent) ? 'rtl' : 'ltr'}
            >
              <p className={cn('whitespace-pre-wrap', isRTL(streamingContent) && 'text-right')}>
                {streamingContent}
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground/60 align-middle" />
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            {voiceAvailable && !isSending && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-10 w-10 shrink-0', isListening && 'animate-pulse text-red-500')}
                onClick={handleVoice}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              >
                <Mic className="h-5 w-5" />
              </Button>
            )}
            <input
              ref={inputRef}
              type="text"
              className="flex-1 rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={isListening ? 'Listening...' : 'Ask or command...'}
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
            />
            {isSending ? (
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => {/* TODO: abort controller */}}
                aria-label="Stop generating"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={handleSend}
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
