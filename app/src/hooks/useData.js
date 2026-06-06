import { useQuery } from '@tanstack/react-query'
import {
  fetchDeployments,
  fetchVolunteers,
  fetchOrganisations,
  fetchVolunteer,
  fetchOrganisation,
} from '../api/data'

export const useDeployments = () =>
  useQuery({
    queryKey: ['deployments'],
    queryFn: () => fetchDeployments({ activeOnly: true }),
    staleTime: 0,
    refetchOnMount: 'always',
  })

export const useAllDeployments = () =>
  useQuery({
    queryKey: ['deployments', 'all'],
    queryFn: () => fetchDeployments({ activeOnly: false }),
    staleTime: 0,
    refetchOnMount: 'always',
  })

export const useVolunteers = () =>
  useQuery({ queryKey: ['volunteers'], queryFn: fetchVolunteers })

export const useOrganisations = () =>
  useQuery({ queryKey: ['organisations'], queryFn: fetchOrganisations })

export const useVolunteer = (id) =>
  useQuery({ queryKey: ['volunteer', id], queryFn: () => fetchVolunteer(id), enabled: !!id })

export const useOrganisation = (id) =>
  useQuery({ queryKey: ['organisation', id], queryFn: () => fetchOrganisation(id), enabled: !!id })
