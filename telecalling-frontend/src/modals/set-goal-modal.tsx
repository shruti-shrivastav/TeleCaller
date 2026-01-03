import { useAtom } from 'jotai'
import { setGoalAtom } from './jotai/goal-modal-atom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createGoal } from '@/features/goals/goal-thunk'
import { useAppDispatch } from '@/hooks/use-store'
import { toast } from 'sonner'

export const SetGoalModal = () => {
  const [state, setState] = useAtom(setGoalAtom)
  const dispatch = useAppDispatch()
  const [target, setTarget] = useState('')
  const [type, setType] = useState('daily_calls')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!state.user) return
    setLoading(true)
    try {
      await dispatch(createGoal({
        userId: state.user.id,
        type,
        target: Number(target),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      })).unwrap()
      toast.success('Goal assigned successfully!')
      setState({ open: false, user: null })
      setTarget('')
    } catch {
      toast.error('Failed to create goal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => setState({ open, user: null })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Goal to {state.user?.firstName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Goal Type</label>
            <select
              className="w-full border p-2 rounded-md mt-1"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="daily_calls">Daily Calls</option>
              <option value="weekly_calls">Weekly Calls</option>
              <option value="conversions">Conversions</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Target Number</label>
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Enter target count"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading || !target}>
            {loading ? 'Saving...' : 'Save Goal'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}