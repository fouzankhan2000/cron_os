import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createWorkflow, updateWorkflow, deleteWorkflow } from '@/lib/github'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const updates = await request.json()

  // Load current job
  const { data: currentJob, error: fetchError } = await supabaseAdmin
    .from('cron_jobs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (fetchError || !currentJob) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Handle workflow changes
  try {
    if ('enabled' in updates) {
      if (updates.enabled && !currentJob.enabled) {
        // Toggling ON
        const path = currentJob.github_workflow_path
          ? await updateWorkflow(
              { id: currentJob.id, name: updates.name || currentJob.name, schedule: updates.schedule || currentJob.schedule },
              currentJob.github_workflow_path
            )
          : await createWorkflow({
              id: currentJob.id,
              name: updates.name || currentJob.name,
              schedule: updates.schedule || currentJob.schedule,
            })
        updates.github_workflow_path = path
      } else if (!updates.enabled && currentJob.enabled && currentJob.github_workflow_path) {
        // Toggling OFF
        await deleteWorkflow(currentJob.github_workflow_path)
        updates.github_workflow_path = null
      }
    } else if (updates.schedule && updates.schedule !== currentJob.schedule && currentJob.github_workflow_path && currentJob.enabled) {
      // Schedule changed
      await updateWorkflow(
        { id: currentJob.id, name: updates.name || currentJob.name, schedule: updates.schedule },
        currentJob.github_workflow_path
      )
    }
  } catch {
    // Workflow update failed — continue with DB update
  }

  const { data: updatedJob, error: updateError } = await supabaseAdmin
    .from('cron_jobs')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json(updatedJob)
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Load job to get workflow path
  const { data: job } = await supabaseAdmin
    .from('cron_jobs')
    .select('github_workflow_path')
    .eq('id', params.id)
    .single()

  // Delete workflow if exists
  if (job?.github_workflow_path) {
    try {
      await deleteWorkflow(job.github_workflow_path)
    } catch {
      // Continue with deletion even if workflow removal fails
    }
  }

  // Delete from Supabase (cascades to runs, posts, etc.)
  const { error } = await supabaseAdmin
    .from('cron_jobs')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
