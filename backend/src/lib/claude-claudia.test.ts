import { describe, it, expect, beforeEach, vi } from 'vitest'

const handleToolCallMock = vi.fn()
const messagesStreamMock = vi.fn()

vi.mock('./claudia-tools', () => ({
  handleToolCall: (...args: unknown[]) => handleToolCallMock(...args),
}))

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { stream: messagesStreamMock }
  }
  return { default: MockAnthropic }
})

interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

function makeStream(toolBlock: ToolUseBlock) {
  const finalMessage = {
    content: [toolBlock],
  }
  async function* iter() {
    // no text deltas — straight to tool_use
  }
  const stream = iter() as AsyncGenerator<unknown> & {
    finalMessage: () => Promise<typeof finalMessage>
  }
  stream.finalMessage = async () => finalMessage
  return stream
}

describe('streamClaudeClaudia tool dispatch', () => {
  beforeEach(() => {
    handleToolCallMock.mockReset()
    messagesStreamMock.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-key'
  })

  it('dispatches find_procedure tool_use and emits tool_result', async () => {
    const { streamClaudeClaudia } = await import('./claude-claudia')

    messagesStreamMock.mockReturnValue(
      makeStream({
        type: 'tool_use',
        id: 'tu_1',
        name: 'find_procedure',
        input: { query: 'inregistrare auto' },
      })
    )

    const toolResult = {
      type: 'tipizatul_action_plan' as const,
      plan: { procedure_id: 'p1', title: 'Test', documents: [] },
      alternatives: [],
    }
    handleToolCallMock.mockResolvedValue(toolResult)

    const events: object[] = []
    await streamClaudeClaudia(
      [{ role: 'user', content: 'cum inregistrez masina' }],
      undefined,
      (e) => events.push(e)
    )

    expect(handleToolCallMock).toHaveBeenCalledWith('find_procedure', {
      query: 'inregistrare auto',
    })
    expect(events).toContainEqual({
      type: 'tool_result',
      tool_name: 'find_procedure',
      result: toolResult,
    })
  })

  it('dispatches handle_life_event tool_use and emits tool_result', async () => {
    const { streamClaudeClaudia } = await import('./claude-claudia')

    messagesStreamMock.mockReturnValue(
      makeStream({
        type: 'tool_use',
        id: 'tu_2',
        name: 'handle_life_event',
        input: { event_type: 'car_from_germany' },
      })
    )

    const toolResult = {
      type: 'action_plan' as const,
      procedure: { event_type: 'car_from_germany', title: 'X' },
      create_life_event: true,
      event_type: 'car_from_germany',
    }
    handleToolCallMock.mockResolvedValue(toolResult)

    const events: object[] = []
    await streamClaudeClaudia(
      [{ role: 'user', content: 'am adus masina din germania' }],
      undefined,
      (e) => events.push(e)
    )

    expect(handleToolCallMock).toHaveBeenCalledWith('handle_life_event', {
      event_type: 'car_from_germany',
    })
    expect(events).toContainEqual({
      type: 'tool_result',
      tool_name: 'handle_life_event',
      result: toolResult,
    })
  })
})
