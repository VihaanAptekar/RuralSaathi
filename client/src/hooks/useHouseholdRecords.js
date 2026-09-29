import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useHouseholdRecords(id) {
	return useQuery({
		queryKey: queryKeys.householdRecords(id),
		queryFn: () => api.get(`/api/households/${id}/records`),
		enabled: id !== undefined && id !== null,
	});
}

export function useAddHouseholdRecord(id, type) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (record) => api.post(`/api/households/${id}/${type}`, record),
		onSuccess: async () => {
			const keys = [
				queryKeys.householdRecords(id),
				queryKeys.budget(id),
				queryKeys.households,
				queryKeys.villageDashboard,
			];
			if (type === 'crops') keys.push(queryKeys.cropRisk(id));
			return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
		},
	});
}
