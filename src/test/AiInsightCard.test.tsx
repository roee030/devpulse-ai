import { render, screen } from '@testing-library/react'
import { AiInsightCard } from '../components/ui/AiInsightCard'

describe('AiInsightCard', () => {
  it('renders the insight text', () => {
    render(<AiInsightCard text="Company health is 72/100." />)
    expect(screen.getByText('Company health is 72/100.')).toBeInTheDocument()
  })

  it('renders the AI Insight label', () => {
    render(<AiInsightCard text="Test" />)
    expect(screen.getByText('AI Insight')).toBeInTheDocument()
  })
})
