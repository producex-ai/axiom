'use client';

import { Loader2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { OrgMember } from '@/actions/clerk';
import {
  type CreateScheduleState,
  createLogScheduleAction,
  updateLogScheduleAction,
} from '@/actions/log-schedules';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' className='w-fit' disabled={pending}>
      {pending ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          {isEditing ? 'Updating...' : 'Creating Schedule...'}
        </>
      ) : isEditing ? (
        'Update Schedule'
      ) : (
        'Create Schedule'
      )}
    </Button>
  );
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

interface ScheduleFormProps {
  templateId: string;
  members: OrgMember[];
  mode?: 'create' | 'edit';
  initialData?: {
    scheduleId: string;
    startDate: string;
    endDate?: string;
    assigneeId?: string;
    reviewerId?: string;
    daysOfWeek: number[];
  };
}

function bindUpdateAction(scheduleId: string) {
  return updateLogScheduleAction.bind(null, scheduleId);
}

export function ScheduleForm({
  templateId,
  members,
  mode = 'create',
  initialData,
}: ScheduleFormProps) {
  const initialState: CreateScheduleState = { message: '', errors: {} };

  const actionToUse =
    mode === 'edit' && initialData?.scheduleId
      ? bindUpdateAction(initialData.scheduleId)
      : createLogScheduleAction;

  const [state, formAction] = useActionState(actionToUse, initialState);

  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialData?.daysOfWeek || []
  );
  const [assigneeId, setAssigneeId] = useState<string>(
    initialData?.assigneeId || ''
  );
  const [reviewerId, setReviewerId] = useState<string>(
    initialData?.reviewerId || ''
  );

  const allDaysSelected = selectedDays.length === DAYS_OF_WEEK.length;

  const handleToggleAll = () => {
    if (allDaysSelected) {
      setSelectedDays([]);
    } else {
      setSelectedDays(DAYS_OF_WEEK.map((d) => d.value));
    }
  };

  const handleDayToggle = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  return (
    <form action={formAction} className='space-y-6'>
      {state.message && !state.success && (
        <Alert variant='destructive'>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.success && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/* Hidden field for template_id (only for create mode) */}
      {mode === 'create' && (
        <input type='hidden' name='template_id' value={templateId} />
      )}

      {/* Hidden inputs for selected days */}
      {selectedDays.map((day) => (
        <input key={day} type='hidden' name='days_of_week' value={day} />
      ))}

      {/* Hidden inputs for selected users */}
      <input type='hidden' name='assignee_id' value={assigneeId} />
      <input type='hidden' name='reviewer_id' value={reviewerId} />

      <Card>
        <CardContent className='space-y-8 pt-6'>
          {/* Date Range */}
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='start_date'>Start Date</Label>
              <Input
                id='start_date'
                name='start_date'
                type='date'
                defaultValue={initialData?.startDate}
                aria-describedby='start_date-error'
                required
              />
              {state.errors?.start_date && (
                <p id='start_date-error' className='text-destructive text-sm'>
                  {state.errors.start_date.join(', ')}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='end_date'>End Date (Optional)</Label>
              <Input
                id='end_date'
                name='end_date'
                type='date'
                defaultValue={initialData?.endDate}
                aria-describedby='end_date-error'
              />
              {state.errors?.end_date && (
                <p id='end_date-error' className='text-destructive text-sm'>
                  {state.errors.end_date.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Assignee and Reviewer */}
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='assignee_select'>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id='assignee_select'>
                  <SelectValue placeholder='Select assignee' />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className='flex items-center gap-2'>
                        <span>
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.assignee_id && (
                <p className='text-destructive text-sm'>
                  {state.errors.assignee_id.join(', ')}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='reviewer_select'>Reviewer</Label>
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger id='reviewer_select'>
                  <SelectValue placeholder='Select reviewer' />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className='flex items-center gap-2'>
                        <span>
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : member.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.reviewer_id && (
                <p className='text-destructive text-sm'>
                  {state.errors.reviewer_id.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Days of Week */}
          <div className='space-y-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <Label>Days of Week</Label>
                <p className='mt-1 text-muted-foreground text-sm'>
                  Select the days when this log should be created
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='select-all-days'
                  checked={allDaysSelected}
                  onCheckedChange={handleToggleAll}
                />
                <Label
                  htmlFor='select-all-days'
                  className='cursor-pointer font-normal text-sm'
                >
                  Select All
                </Label>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7'>
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.value}
                  className='flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50'
                >
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={selectedDays.includes(day.value)}
                    onCheckedChange={() => handleDayToggle(day.value)}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className='flex-1 cursor-pointer font-normal text-sm'
                  >
                    <span className='sm:hidden'>{day.label}</span>
                    <span className='hidden sm:inline'>{day.label}</span>
                  </Label>
                </div>
              ))}
            </div>
            {state.errors?.days_of_week && (
              <p className='text-destructive text-sm'>
                {state.errors.days_of_week.join(', ')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <SubmitButton isEditing={mode === 'edit'} />
      </div>
    </form>
  );
}
