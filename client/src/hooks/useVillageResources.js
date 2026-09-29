import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { queryKeys } from '../api/queryKeys.js';

export function useVillageResources() {
	return useQuery({
		queryKey: queryKeys.villageResources,
		queryFn: () => api.get('/api/village/resources'),
	});
}

function useResourceChange(path) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, changes }) => api.patch(`${path}/${id}`, changes),
		onSuccess: async () => Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.villageResources }),
			queryClient.invalidateQueries({ queryKey: queryKeys.consultancy }),
		]),
	});
}

export function useUpdateVillageResource() {
	return useResourceChange('/api/village/resources');
}

export function useUpdateVillageSkill() {
	return useResourceChange('/api/village/skills');
}
