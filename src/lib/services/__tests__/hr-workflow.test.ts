import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processApproval } from '../workflow'

// Mock Supabase Builder (Thenable)
const mockBuilder = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    then: vi.fn(),
}

// Mock Supabase Client (Not Thenable)
const mockClient = {
    from: vi.fn(() => mockBuilder),
}

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(async () => mockClient),
}))

describe('HR Workflow E2E Integration', () => {
    const mockRequestId = 'req-123';
    const mockEntityId = 'ent-123';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Leave Request Workflow', () => {
        it('should sync leave request status on manager approval', async () => {
            const mockRequest = {
                id: mockRequestId,
                entity_type: 'leave',
                entity_id: mockEntityId,
                current_step: 1,
                workflow_definitions: {
                    steps: [
                        { order: 1, role: 'line_manager', required: true },
                        { order: 2, role: 'hr', required: true }
                    ]
                },
                status: 'pending'
            };

            // Specify the behavior for each call in sequence
            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // 1. Get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled))            // 2. Insert action
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, current_step: 2 }, error: null }).then(onFulfilled)) // 3. Update request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled));           // 4. Update leave_request

            await processApproval({
                requestId: mockRequestId,
                approverId: 'mgr-1',
                action: 'approved'
            });

            expect(mockClient.from).toHaveBeenCalledWith('leave_requests');
            expect(mockBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'hr_pending',
                line_manager_approved_by: 'mgr-1'
            }));
        });

        it('should mark leave as approved on final HR approval', async () => {
            const mockRequest = {
                id: mockRequestId,
                entity_type: 'leave',
                entity_id: mockEntityId,
                current_step: 2,
                workflow_definitions: {
                    steps: [
                        { order: 1, role: 'line_manager', required: true },
                        { order: 2, role: 'hr', required: true }
                    ]
                },
                status: 'pending'
            };

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // 1. Get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled))            // 2. Insert action
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, status: 'approved' }, error: null }).then(onFulfilled)) // 3. Update request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled));           // 4. Update leave_request

            await processApproval({
                requestId: mockRequestId,
                approverId: 'hr-1',
                action: 'approved'
            });

            expect(mockBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'approved',
                hr_approved_by: 'hr-1'
            }));
        });
    });

    describe('Per Diem Request Workflow', () => {
        it('should sync per diem status on final finance approval', async () => {
            const mockRequest = {
                id: mockRequestId,
                entity_type: 'per_diem',
                entity_id: mockEntityId,
                current_step: 2,
                workflow_definitions: {
                    steps: [
                        { order: 1, role: 'line_manager', required: true },
                        { order: 2, role: 'finance', required: true }
                    ]
                },
                status: 'pending'
            };

            mockBuilder.then
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: mockRequest, error: null }).then(onFulfilled)) // 1. Get request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled))            // 2. Insert action
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: { ...mockRequest, status: 'approved' }, error: null }).then(onFulfilled)) // 3. Update request
                .mockImplementationOnce((onFulfilled: any) => Promise.resolve({ data: {}, error: null }).then(onFulfilled));           // 4. Update per_diem_request

            await processApproval({
                requestId: mockRequestId,
                approverId: 'fin-1',
                action: 'approved'
            });

            expect(mockClient.from).toHaveBeenCalledWith('per_diem_requests');
            expect(mockBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'approved',
                finance_approved_by: 'fin-1'
            }));
        });
    });
});
