import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useCropRisk(id) {
	return useQuery({
		queryKey: queryKeys.cropRisk(id),
		queryFn: () => api.get(`/api/households/${id}/crop-risk`),
		enabled: id !== undefined && id !== null,
	});
}
