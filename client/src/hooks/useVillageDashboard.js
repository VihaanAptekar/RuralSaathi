import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useVillageDashboard() {
	return useQuery({
		queryKey: queryKeys.villageDashboard,
		queryFn: () => api.get('/api/village/dashboard'),
	});
}
