import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useBudget(id) {
	return useQuery({
		queryKey: queryKeys.budget(id),
		queryFn: () => api.get(`/api/households/${id}/budget`),
		enabled: id !== undefined && id !== null,
	});
}
