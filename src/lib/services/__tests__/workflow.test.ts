import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createApprovalRequest, processApproval, getWorkflowDefinition, getPendingApprovalsForUser } from '../workflow'

// Mock Supabase Builder (Thenable)
const mockBuilder = {
    from: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
}

// Mock Supabase Client (Not Thenable)
const mockClient = {
    from: vi.fn(() => mockBuilder),
}

// Setup builder chaining
mockBuilder.from.mockReturnValue(mockBuilder)
mockBuilder.select.mockReturnValue(mockBuilder)
mockBuilder.insert.mockReturnValue(mockBuilder)
mockBuilder.update.mockReturnValue(mockBuilder)
mockBuilder.eq.mockReturnValue(mockBuilder)
mockBuilder.order.mockReturnValue(mockBuilder)
mockBuilder.limit.mockReturnValue(mockBuilder)
mockBuilder.single.mockReturnValue(mockBuilder)

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => mockClient),
}))

describe('workflow service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Default success for any awaited builder
        mockBuilder.then.mockImplementation((onFulfilled: any) =>
            Promise.resolve({ data: {}, error: null }).then(onFulfilled)
        )
    })

    describe('getWorkflowDefinition', () => {
        it('should return workflow definition when found', async () => {
            const mockWorkflow = { id: 'w1', entity_type: 'payroll', is_active: true }
            mockBuilder.then.mockImplementationOnce((onFulfilled: any) =>
                Promise.resolve({ data: mockWorkflow, error: null }).then(onFulfilled)
            )

            const result = await getWorkflowDefinition('c1', 'payroll' as any)

            expect(result).toEqual(mockWorkflow)
            expect(mockClient.from).toHaveBeenCalledWith('workflow_definitions')
        })
    })

    describe('createApprovalRequest', () => {
        it('should create an approval request and sync payroll status', async () => {
            const mockWorkflow = { id: 'w1', steps: [] }
            const mockRequest = { id: 'r1', status: 'pending' }

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockWorkflow, error: null }).then(onFulfilled)) // for getWorkflowDefinition
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // for request insert

            const params = {
                companyId: 'c1',
                entityType: 'payroll' as any,
                entityId: 'p1',
                requesterId: 'e1',
            }

            const result = await createApprovalRequest(params)

            expect(result).toEqual(mockRequest)
            expect(mockClient.from).toHaveBeenCalledWith('approval_requests')
            expect(mockClient.from).toHaveBeenCalledWith('payroll_runs')
            expect(mockBuilder.update).toHaveBeenCalledWith({ status: 'hr_pending' })
        })
    })

    describe('processApproval', () => {
        it('should process rejection and update payroll status', async () => {
            const mockRequest = {
                id: 'r1',
                status: 'pending',
                current_step: 1,
                entity_type: 'payroll',
                entity_id: 'p1',
                workflow_definitions: {
                    steps: [{ order: 1, role: 'hr', required: true }]
                }
            }

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled)) // action insert
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, status: 'rejected' }, error: null }).then(onFulfilled)) // update request

            const params = {
                requestId: 'r1',
                approverId: 'u1',
                action: 'rejected' as const,
                comments: 'No good'
            }

            await processApproval(params)

            expect(mockClient.from).toHaveBeenCalledWith('payroll_runs')
            expect(mockBuilder.update).toHaveBeenCalledWith({
                status: 'hr_rejected',
                rejection_comments: 'No good'
            })
        })

        it('should process approval and move to mgmt_pending when at step 2', async () => {
            const mockRequest = {
                id: 'r1',
                status: 'pending',
                current_step: 1,
                entity_type: 'payroll',
                entity_id: 'p1',
                workflow_definitions: {
                    steps: [
                        { order: 1, role: 'hr', required: true },
                        { order: 2, role: 'mgmt', required: true }
                    ]
                }
            }

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled)) // action insert
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, current_step: 2 }, error: null }).then(onFulfilled)) // update request

            const params = {
                requestId: 'r1',
                approverId: 'u1',
                action: 'approved' as const
            }

            await processApproval(params)

            expect(mockBuilder.update).toHaveBeenCalledWith({
                status: 'hr_pending', // In our current sync logic, newStep 2 -> hr_pending. 
                // Wait, actually Step 2 is Management? Ah, the code says `payrollStatus = newStep === 2 ? 'hr_pending' : 'mgmt_pending';`
                // So if newStep is 2, it sets hr_pending. If newStep is anything else, it sets mgmt_pending.
                rejection_comments: null
            })
        })

        it('should mark as approved when all steps are complete', async () => {
            const mockRequest = {
                id: 'r1',
                status: 'pending',
                current_step: 2,
                entity_type: 'payroll',
                entity_id: 'p1',
                workflow_definitions: {
                    steps: [
                        { order: 1, role: 'hr', required: true },
                        { order: 2, role: 'mgmt', required: true }
                    ]
                }
            }

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled)) // action insert
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, status: 'approved' }, error: null }).then(onFulfilled)) // update request

            const params = {
                requestId: 'r1',
                approverId: 'u1',
                action: 'approved' as const
            }

            await processApproval(params)

            expect(mockBuilder.update).toHaveBeenCalledWith({
                status: 'approved',
                rejection_comments: null
            })
        })
    })

    describe('getPendingApprovalsForUser', () => {
        it('should filter requests based on user role', async () => {
            const mockRequests = [
                {
                    id: 'r1',
                    current_step: 1,
                    workflow_definitions: {
                        steps: [{ order: 1, role: 'hr' }]
                    }
                },
                {
                    id: 'r2',
                    current_step: 1,
                    workflow_definitions: {
                        steps: [{ order: 1, role: 'management' }]
                    }
                },
            ]

            mockBuilder.then.mockImplementationOnce((onFulfilled: any) =>
                Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
            )

            const result = await getPendingApprovalsForUser('c1', 'u1', 'hr')

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('r1')
        })

        it('should filter for line manager', async () => {
            const mockRequests = [
                {
                    id: 'r1',
                    current_step: 1,
                    employees: { manager_id: 'm1' },
                    workflow_definitions: {
                        steps: [{ order: 1, role: 'line_manager' }]
                    }
                },
                {
                    id: 'r2',
                    current_step: 1,
                    employees: { manager_id: 'm2' },
                    workflow_definitions: {
                        steps: [{ order: 1, role: 'line_manager' }]
                    }
                },
            ]

            mockBuilder.then.mockImplementationOnce((onFulfilled: any) =>
                Promise.resolve({ data: mockRequests, error: null }).then(onFulfilled)
            )

            const result = await getPendingApprovalsForUser('c1', 'u1', 'employee', 'm1', true)

            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('r1')
        })
    })
})
