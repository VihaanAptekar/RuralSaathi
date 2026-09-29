import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function useMeta() {
	return useQuery({ queryKey: ['meta'], queryFn: () => api.get('/api/meta') });
}

export function useReseedDemoData() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.post('/api/admin/reseed', {}),
		onSuccess: () => queryClient.invalidateQueries(),
	});
}
