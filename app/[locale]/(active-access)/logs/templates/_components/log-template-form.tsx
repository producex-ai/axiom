'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  type CreateTemplateState,
  createLogTemplateAction,
  updateLogTemplateAction,
} from '@/actions/log-templates';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReviewTimePeriod } from '@/db/queries/log-templates';
import { CATEGORY_OPTIONS, SOP_OPTIONS } from '@/lib/constants/log-templates';

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type='submit' className='w-fit' disabled={pending}>
      {pending ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          {isEditing ? 'Updating...' : 'Creating...'}
        </>
      ) : isEditing ? (
        'Update Template'
      ) : (
        'Create Template'
      )}
    </Button>
  );
}

// Helper to bind additional arguments to the server action
function bindUpdateAction(id: string) {
  return updateLogTemplateAction.bind(null, id);
}

interface LogTemplateFormProps {
  mode?: 'create' | 'edit';
  initialData?: {
    id: string;
    name: string;
    category: string | null;
    sop: string | null;
    task_list: string[] | null;
    review_time: ReviewTimePeriod | null;
  };
}

export function LogTemplateForm({
  mode = 'create',
  initialData,
}: LogTemplateFormProps) {
  const initialState: CreateTemplateState = { message: '', errors: {} };

  // Choose the action based on mode
  const actionToUse =
    mode === 'edit' && initialData?.id
      ? bindUpdateAction(initialData.id)
      : createLogTemplateAction;

  const [state, formAction] = useActionState(actionToUse, initialState);

  // Initialize tasks from initialData or default to one empty task
  const initialTasks =
    initialData?.task_list && initialData.task_list.length > 0
      ? initialData.task_list
      : [''];

  const [tasks, setTasks] = useState<{ id: number; defaultValue: string }[]>(
    initialTasks.map((t, i) => ({ id: i, defaultValue: t }))
  );
  const [nextId, setNextId] = useState(initialTasks.length);

  const addTask = () => {
    setTasks([...tasks, { id: nextId, defaultValue: '' }]);
    setNextId(nextId + 1);
  };

  const removeTask = (idToRemove: number) => {
    if (tasks.length <= 1) return;
    setTasks(tasks.filter((t) => t.id !== idToRemove));
  };

  return (
    <form action={formAction} className='space-y-6'>
      {state.message && (
        <Alert variant='destructive'>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className='space-y-6 pt-6'>
          {/* Top Row: Name, Category, SOP */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Template Name</Label>
              <Input
                id='name'
                name='name'
                defaultValue={initialData?.name}
                placeholder='e.g., Opening Checklist'
                aria-describedby='name-error'
                required
              />
              {state.errors?.name && (
                <p id='name-error' className='text-destructive text-sm'>
                  {state.errors.name.join(', ')}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='category'>Category</Label>
              <Select
                name='category'
                defaultValue={initialData?.category || undefined}
                required
              >
                <SelectTrigger className='w-full' id='category'>
                  <SelectValue placeholder='Select a category' />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.category && (
                <p id='category-error' className='text-destructive text-sm'>
                  {state.errors.category.join(', ')}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='sop'>Standard Operating Procedure (SOP)</Label>
              <Select
                name='sop'
                defaultValue={initialData?.sop || undefined}
                required
              >
                <SelectTrigger className='w-full' id='sop'>
                  <SelectValue placeholder='Select an SOP module' />
                </SelectTrigger>
                <SelectContent>
                  {SOP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.sop && (
                <p id='sop-error' className='text-destructive text-sm'>
                  {state.errors.sop.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Review Time */}
          <div className='space-y-2'>
            <Label htmlFor='review_time'>Review Time</Label>
            <Select
              name='review_time'
              defaultValue={initialData?.review_time || '1_year'}
              required
            >
              <SelectTrigger id='review_time'>
                <SelectValue placeholder='Select review period' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1_month'>1 Month</SelectItem>
                <SelectItem value='3_months'>3 Months</SelectItem>
                <SelectItem value='6_months'>6 Months</SelectItem>
                <SelectItem value='1_year'>1 Year</SelectItem>
              </SelectContent>
            </Select>
            {state.errors?.review_time && (
              <p className='text-destructive text-sm'>
                {state.errors.review_time.join(', ')}
              </p>
            )}
            <p className='text-muted-foreground text-xs'>
              How often this template should be reviewed
            </p>
          </div>

          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='font-medium text-lg'>Task List</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addTask}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Task
              </Button>
            </div>

            <div className='space-y-3'>
              {tasks.map((task, index) => (
                <div key={task.id} className='flex gap-2'>
                  <div className='flex-1'>
                    <Input
                      name='tasks'
                      defaultValue={task.defaultValue}
                      placeholder={`Task ${index + 1}`}
                      aria-label={`Task ${index + 1}`}
                      required // All tasks are required to not be empty
                    />
                  </div>
                  {tasks.length > 1 ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => removeTask(task.id)}
                      aria-label='Remove task'
                    >
                      <Trash2 className='h-4 w-4 text-muted-foreground hover:text-destructive' />
                    </Button>
                  ) : (
                    <div className='w-10' />
                  )}
                </div>
              ))}
              {state.errors?.tasks && (
                <p className='text-destructive text-sm'>
                  {state.errors.tasks.join(', ')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end'>
        <SubmitButton isEditing={mode === 'edit'} />
      </div>
    </form>
  );
}
