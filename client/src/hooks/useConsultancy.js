import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useConsultancy() {
	return useQuery({
		queryKey: queryKeys.consultancy,
		queryFn: () => api.get('/api/consultancy/projects'),
	});
}

export function useSimulateConsultancy() {
	return useMutation({ mutationFn: (scenario) => api.post('/api/consultancy/simulate', scenario) });
}

export function useAdvisoryLogs() {
	return useQuery({
		queryKey: queryKeys.advisoryLogs,
		queryFn: () => api.get('/api/advisory-logs'),
	});
}
