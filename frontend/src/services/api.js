// ---------------------------------------------------------------------------
// API SERVICE LAYER
// ---------------------------------------------------------------------------
// This file is the single interface connecting the frontend React app to the
// FastAPI backend and SQLite database.
// ---------------------------------------------------------------------------

import axios from 'axios'
import {
  dataSources,
  maintenanceTasks,
  blockRequests,
  aiRecommendedBlock,
  alerts,
  trains,
  dashboardSummary,
  analyticsTrends,
  pipelineStages,
  pipelineRunMeta,
  dataQualityIssues,
  unifiedDatasetSummary,
  bundlingOpportunities,
  generatedPlanBlocks,
} from '../data/mockData'
import { CORRIDORS } from '../utils/constants'
import * as workflow from './workflowStore'

// Set to false for real backend communication
export const USE_MOCK = false

// Matches the actual FastAPI backend (see main.py).
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
async function getDashboardSummary(filters = {}) {
  if (USE_MOCK) {
    await delay(300)
    const department = filters.department || null
    const allTasks = workflow.getCombinedTasks()
    const allRequests = workflow.getCombinedBlockRequests()
    const scopedTasks = department ? allTasks.filter((t) => t.department === department) : allTasks
    const scopedRequests = department ? allRequests.filter((b) => b.department === department) : allRequests
    return {
      assetAvailabilityPct: dashboardSummary.assetAvailabilityPct,
      criticalTasks: scopedTasks.filter((t) => t.severity === 'Critical').length,
      overdueTasks: scopedTasks.filter((t) => t.status === 'Overdue').length,
      blockUtilizationPct: dashboardSummary.blockUtilizationPct,
      trainConflicts: scopedRequests.filter((b) => b.status === 'Conflict').length,
      departmentTaskCount: scopedTasks.length,
      pendingBlockRequests: scopedRequests.filter((b) => b.status === 'Pending Review').length,
      approvedBlockRequests: scopedRequests.filter((b) => b.status === 'Approved').length,
      scopeDepartment: department,
    }
  }
  const { data } = await httpClient.get('/dashboard/summary', { params: filters })
  return data
}

async function getAiRecommendedBlock() {
  if (USE_MOCK) {
    await delay(500)
    return clone(aiRecommendedBlock)
  }
  const { data } = await httpClient.get('/blocks/recommended')
  return data
}

// ---------------------------------------------------------------------------
// Data sources / processing pipeline
// ---------------------------------------------------------------------------
async function getDataSources(filters = {}) {
  if (USE_MOCK) {
    await delay(350)
    const department = filters.department || null
    let result = clone(dataSources)
    if (department) {
      result = result.filter((s) => s.owner === department || s.owner === 'Operations')
    }
    return result
  }
  const { data } = await httpClient.get('/data-sources', { params: filters })
  return data
}

async function getProcessingPipeline() {
  if (USE_MOCK) {
    await delay(400)
    return {
      stages: clone(pipelineStages),
      ...clone(pipelineRunMeta),
    }
  }
  const { data } = await httpClient.get('/data-processing/pipeline')
  return data
}

async function getDataQualityIssues() {
  if (USE_MOCK) {
    await delay(350)
    return clone(dataQualityIssues)
  }
  const { data } = await httpClient.get('/data-processing/quality-issues')
  return data
}

async function getUnifiedDatasetSummary() {
  if (USE_MOCK) {
    await delay(300)
    return clone(unifiedDatasetSummary)
  }
  const { data } = await httpClient.get('/data-processing/unified-dataset')
  return data
}

async function runPipeline() {
  if (USE_MOCK) {
    await delay(1200)
    return { stages: clone(pipelineStages), ...clone(pipelineRunMeta) }
  }
  const { data } = await httpClient.post('/data-processing/run')
  return data
}

// ---------------------------------------------------------------------------
// Maintenance tasks & Bundling
// ---------------------------------------------------------------------------
async function getTasks(filters = {}) {
  if (USE_MOCK) {
    await delay(400)
    let result = workflow.getCombinedTasks()
    if (filters.department) result = result.filter((t) => t.department === filters.department)
    if (filters.severity) result = result.filter((t) => t.severity === filters.severity)
    if (filters.status) result = result.filter((t) => t.status === filters.status)
    if (filters.overdueOnly) result = result.filter((t) => t.status === 'Overdue' || t.status === 'Pending')
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((t) => t.id.toLowerCase().includes(q) || (t.asset && t.asset.toLowerCase().includes(q)) || (t.location && t.location.toLowerCase().includes(q)) || (t.defect && t.defect.toLowerCase().includes(q)))
    }
    return result
  }
  const { data } = await httpClient.get('/tasks', { params: filters })
  return data
}

async function getTaskById(taskId) {
  if (USE_MOCK) {
    await delay(250)
    return clone(maintenanceTasks.find((t) => t.id === taskId)) || null
  }
  const { data } = await httpClient.get(`/tasks/${taskId}`)
  return data
}

async function getBundlingOpportunities() {
  if (USE_MOCK) {
    await delay(300)
    return clone(bundlingOpportunities)
  }
  const { data } = await httpClient.get('/maintenance/bundling-opportunities')
  return data
}

// ---------------------------------------------------------------------------
// Corridors & Trains
// ---------------------------------------------------------------------------
async function getCorridors() {
  if (USE_MOCK) {
    await delay(150)
    return clone(CORRIDORS)
  }
  const { data } = await httpClient.get('/corridors')
  return data
}

async function getTrains() {
  if (USE_MOCK) {
    await delay(350)
    return clone(trains)
  }
  const { data } = await httpClient.get('/trains')
  return data
}

async function getSections() {
  const { data } = await httpClient.get('/sections')
  return data
}

async function getStations() {
  const { data } = await httpClient.get('/stations')
  return data
}

// ---------------------------------------------------------------------------
// Block Requests & Maintenance Requests
// ---------------------------------------------------------------------------
async function getBlockRequests(filters = {}) {
  if (USE_MOCK) {
    await delay(400)
    let result = workflow.getCombinedBlockRequests()
    if (filters.department) result = result.filter((b) => b.department === filters.department)
    if (filters.status) result = result.filter((b) => b.status === filters.status)
    if (filters.priority) result = result.filter((b) => b.priority === filters.priority)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((b) => b.id.toLowerCase().includes(q) || (b.corridor && b.corridor.toLowerCase().includes(q)))
    }
    return result
  }
  const { data } = await httpClient.get('/block-requests', { params: filters })
  return data
}

async function createMaintenanceRequest(request, meta) {
  const { data } = await httpClient.post('/maintenance-requests', request)
  if (meta) {
    try {
      workflow.createRequest(request, meta)
    } catch {
      // Local cache update is optional
    }
  }
  return data.request || data
}

async function getMaintenanceRequests() {
  const { data } = await httpClient.get('/maintenance-requests')
  return data
}

async function approveMaintenanceRequest(id, actor) {
  const { data } = await httpClient.post(`/maintenance-requests/${id}/approve`)
  return data
}

async function rejectMaintenanceRequest(id, reason, actor) {
  const { data } = await httpClient.post(`/maintenance-requests/${id}/reject`, {
    reason,
    actor,
  })
  return data
}

async function modifyMaintenanceRequest(id, changes, actor) {
  const payload = {
    request: changes.request || changes,
    actor,
  }
  const { data } = await httpClient.patch(`/maintenance-requests/${id}`, payload)
  return data
}

async function getMyRequests(userName) {
  const { data } = await httpClient.get('/maintenance-requests')
  return data
}

// ---------------------------------------------------------------------------
// Optimization & Plans (FastAPI + OR-Tools Backend)
// ---------------------------------------------------------------------------
async function optimize(payload, options = {}) {
  const body = {
    ...payload,
    objective_type: options.objective || payload?.objective_type || 'BALANCED',
  }
  const { data } = await httpClient.post('/optimize', body)
  return data
}

async function optimizeFromDatabase(payload = {}) {
  let body = {}
  if (Array.isArray(payload)) {
    body = { request_ids: payload }
  } else if (payload && typeof payload === 'object') {
    body = payload
  }
  const { data } = await httpClient.post('/optimize/database', body)
  return data
}

async function getPlans() {
  const { data } = await httpClient.get('/plans')
  return data
}

async function getPlan(planId) {
  const { data } = await httpClient.get(`/plans/${planId}`)
  return data
}

async function getPlanDashboard(planId) {
  const { data } = await httpClient.get(`/plans/${planId}/dashboard`)
  return data
}


async function reoptimizePlan(planId) {
  const { data } = await httpClient.post(`/plans/${planId}/reoptimize`)
  return data
}

async function approvePlan(result) {
  const { data } = await httpClient.post('/plans/approve', result)
  return data
}
async function rejectPlan(planId, reason) {
  const { data } = await httpClient.post(`/plans/${planId}/reject`, { reason })
  return data
}

async function modifyPlan(planId, changes) {
  const { data } = await httpClient.post(`/plans/${planId}/modify`, { changes })
  return data
}

// ---------------------------------------------------------------------------
// Simulation, Analytics, Alerts & Disruptions
// ---------------------------------------------------------------------------
async function runSimulation(scenario) {
  const { data } = await httpClient.post('/simulation', scenario)
  return data
}

async function getAnalytics() {
  const { data } = await httpClient.get('/analytics')
  return data
}

async function getAlerts(filters = {}) {
  const { data } = await httpClient.get('/alerts', { params: filters })
  return data
}

async function getDisruptions() {
  const { data } = await httpClient.get('/disruptions')
  return data
}

async function createDisruption(disruption) {
  const { data } = await httpClient.post('/disruptions', disruption)
  return data
}

async function getActivities() {
  const { data } = await httpClient.get('/activities')
  return data
}

async function getWorkflowAnalytics() {
  const { data } = await httpClient.get('/workflow-analytics')
  return data
}

const api = {
  getDashboardSummary,
  getAiRecommendedBlock,
  getDataSources,
  getProcessingPipeline,
  getDataQualityIssues,
  getUnifiedDatasetSummary,
  runPipeline,
  getTasks,
  getTaskById,
  getBundlingOpportunities,
  getCorridors,
  getBlockRequests,
  getTrains,
  getSections,
  getStations,
  getPlans,
  getPlan,
  getPlanDashboard,
  optimize,
  optimizeFromDatabase,

  approvePlan,
  rejectPlan,
  modifyPlan,
  reoptimizePlan,
  runSimulation,
  getAnalytics,
  getAlerts,
  createMaintenanceRequest,
  getMaintenanceRequests,
  approveMaintenanceRequest,
  rejectMaintenanceRequest,
  modifyMaintenanceRequest,
  getMyRequests,
  getDisruptions,
  createDisruption,
  getActivities,
  getWorkflowAnalytics,
}

export default api
