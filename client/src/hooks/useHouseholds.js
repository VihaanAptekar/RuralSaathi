import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useHouseholds() {
	return useQuery({ queryKey: queryKeys.households, queryFn: () => api.get('/api/households') });
}

export function useCreateHousehold() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (household) => api.post('/api/households', household),
		onSuccess: async () => Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.households }),
			queryClient.invalidateQueries({ queryKey: queryKeys.villageDashboard }),
		]),
	});
}
