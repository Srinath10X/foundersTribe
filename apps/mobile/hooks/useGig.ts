/**
 * ============================================================
 * REACT QUERY HOOKS - Data fetching hooks for Gig Marketplace
 * ============================================================
 * 
 * Powered by TanStack React Query for:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Optimistic mutations
 * - Infinite scroll pagination
 * - Loading/error states
 * 
 * Query Key Convention:
 * - ["gigs", filters?]        - list of gigs
 * - ["gigs", "me", filters?]  - my gigs
 * - ["gigs", id]              - single gig
 * - ["gigs", "stats"]         - freelancer stats
 * - ["proposals", gigId]      - proposals for a gig
 * - ["proposals", "me"]       - my proposals
 * - ["contracts", filters?]   - contracts list
 * - ["contracts", id]         - single contract
 * - ["messages", contractId]  - contract messages
 * - ["notifications"]         - notifications
 * - ["profile", "me"]         - my profile
 * ============================================================
 */

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import gigService, { GigServiceError } from "@/lib/gigService";
import type {
  Gig,
  GigCreateInput,
  GigUpdateInput,
  GigFilters,
  PaginatedGigs,
  FreelancerStats,
  Contract,
  ContractFilters,
  ContractMessage,
  MessageCreateInput,
  MessageListParams,
  PaginatedContracts,
  PaginatedMessages,
  Proposal,
  ProposalCreateInput,
  ProposalFilters,
  PaginatedProposals,
  Rating,
  RatingCreateInput,
  Notification,
  NotificationFilters,
  PaginatedNotifications,
  UserProfile,
  UserProfileUpsertInput,
} from "@/types/gig";

// ============================================================
// QUERY KEYS (centralized for invalidation)
// ============================================================

export const queryKeys = {
  gigs: {
    all: ["gigs"] as const,
    list: (filters?: GigFilters) => ["gigs", "list", filters] as const,
    mine: (filters?: GigFilters) => ["gigs", "me", filters] as const,
    detail: (id: string) => ["gigs", id] as const,
    stats: () => ["gigs", "stats"] as const,
  },
  proposals: {
    all: ["proposals"] as const,
    forGig: (gigId: string, filters?: ProposalFilters) => ["proposals", "gig", gigId, filters] as const,
    mine: (filters?: ProposalFilters) => ["proposals", "me", filters] as const,
  },
  contracts: {
    all: ["contracts"] as const,
    list: (filters?: ContractFilters) => ["contracts", "list", filters] as const,
    detail: (id: string) => ["contracts", id] as const,
  },
  messages: {
    forContract: (contractId: string, params?: MessageListParams) =>
      ["messages", contractId, params] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (filters?: NotificationFilters) => ["notifications", "list", filters] as const,
  },
  profile: {
    me: () => ["profile", "me"] as const,
  },
};

// ============================================================
// GIG HOOKS
// ============================================================

/**
 * Fetch all gigs with optional filters
 */
export function useGigs(filters?: GigFilters, enabled = true) {
  return useQuery<PaginatedGigs, GigServiceError>({
    queryKey: queryKeys.gigs.list(filters),
    queryFn: () => gigService.getGigs(filters),
    enabled,
  });
}

/**
 * Fetch current user's (founder) gigs
 */
export function useMyGigs(filters?: GigFilters, enabled = true) {
  return useQuery<PaginatedGigs, GigServiceError>({
    queryKey: queryKeys.gigs.mine(filters),
    queryFn: () => gigService.getMyGigs(filters),
    enabled,
  });
}

/**
 * Fetch a single gig by ID
 */
export function useGig(id: string | null | undefined, enabled = true) {
  return useQuery<Gig, GigServiceError>({
    queryKey: queryKeys.gigs.detail(id!),
    queryFn: () => gigService.getGig(id!),
    enabled: enabled && !!id,
  });
}

/**
 * Infinite scroll gigs
 */
export function useInfiniteGigs(filters?: Omit<GigFilters, "cursor">) {
  return useInfiniteQuery<PaginatedGigs, GigServiceError>({
    queryKey: ["gigs", "infinite", filters],
    queryFn: ({ pageParam }) =>
      gigService.getGigs({ ...filters, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

/**
 * Create a new gig
 */
export function useCreateGig() {
  const queryClient = useQueryClient();

  return useMutation<Gig, GigServiceError, GigCreateInput>({
    mutationFn: (data) => gigService.createGig(data),
    onSuccess: () => {
      // Invalidate gig lists so they refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

/**
 * Update a gig
 */
export function useUpdateGig() {
  const queryClient = useQueryClient();

  return useMutation<Gig, GigServiceError, { id: string; data: GigUpdateInput }>({
    mutationFn: ({ id, data }) => gigService.updateGig(id, data),
    onSuccess: (updatedGig) => {
      // Update the cache for this specific gig
      queryClient.setQueryData(queryKeys.gigs.detail(updatedGig.id), updatedGig);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

/**
 * Delete a gig
 */
export function useDeleteGig() {
  const queryClient = useQueryClient();

  return useMutation<void, GigServiceError, string>({
    mutationFn: (id) => gigService.deleteGig(id),
    onSuccess: (_data, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.gigs.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

// ============================================================
// STATS HOOKS
// ============================================================

/**
 * Fetch freelancer stats
 */
export function useFreelancerStats(enabled = true) {
  return useQuery<FreelancerStats, GigServiceError>({
    queryKey: queryKeys.gigs.stats(),
    queryFn: () => gigService.getStats(),
    enabled,
    staleTime: 1000 * 60 * 2, // stats can be stale for 2 min
  });
}

// ============================================================
// PROPOSAL HOOKS
// ============================================================

/**
 * Fetch proposals for a specific gig (founder/owner view)
 */
export function useGigProposals(gigId: string | null | undefined, filters?: ProposalFilters, enabled = true) {
  return useQuery<PaginatedProposals, GigServiceError>({
    queryKey: queryKeys.proposals.forGig(gigId!, filters),
    queryFn: () => gigService.getGigProposals(gigId!, filters),
    enabled: enabled && !!gigId,
  });
}

/**
 * Fetch current user's own proposals (freelancer view)
 */
export function useMyProposals(filters?: ProposalFilters, enabled = true) {
  return useQuery<PaginatedProposals, GigServiceError>({
    queryKey: queryKeys.proposals.mine(filters),
    queryFn: () => gigService.getMyProposals(filters),
    enabled,
  });
}

/**
 * Submit a proposal for a gig
 */
export function useSubmitProposal() {
  const queryClient = useQueryClient();

  return useMutation<Proposal, GigServiceError, { gigId: string; data: ProposalCreateInput }>({
    mutationFn: ({ gigId, data }) => gigService.submitProposal(gigId, data),
    onSuccess: (_data, { gigId }) => {
      // Invalidate proposals for this gig and own proposals
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.forGig(gigId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.mine() });
      // Gig proposals_count changed
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.detail(gigId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

/**
 * Accept a proposal (founder action - creates a contract)
 */
export function useAcceptProposal() {
  const queryClient = useQueryClient();

  return useMutation<{ contract_id: string }, GigServiceError, { proposalId: string; gigId: string }>({
    mutationFn: ({ proposalId }) => gigService.acceptProposal(proposalId),
    onSuccess: (_data, { gigId }) => {
      // Invalidate all affected queries
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.forGig(gigId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.detail(gigId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

/**
 * Reject a proposal (founder action)
 */
export function useRejectProposal() {
  const queryClient = useQueryClient();

  return useMutation<void, GigServiceError, { proposalId: string; gigId: string }>({
    mutationFn: ({ proposalId }) => gigService.rejectProposal(proposalId),
    onSuccess: (_data, { gigId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.forGig(gigId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all });
    },
  });
}

// ============================================================
// CONTRACT HOOKS
// ============================================================

/**
 * Fetch contracts for the current user
 */
export function useContracts(filters?: ContractFilters, enabled = true) {
  return useQuery<PaginatedContracts, GigServiceError>({
    queryKey: queryKeys.contracts.list(filters),
    queryFn: () => gigService.getContracts(filters),
    enabled,
  });
}

/**
 * Fetch a single contract by ID
 */
export function useContract(id: string | null | undefined, enabled = true) {
  return useQuery<Contract, GigServiceError>({
    queryKey: queryKeys.contracts.detail(id!),
    queryFn: () => gigService.getContract(id!),
    enabled: enabled && !!id,
  });
}

/**
 * Mark contract as complete (freelancer action)
 */
export function useCompleteContract() {
  const queryClient = useQueryClient();

  return useMutation<Contract, GigServiceError, string>({
    mutationFn: (id) => gigService.completeContract(id),
    onSuccess: (updatedContract) => {
      queryClient.setQueryData(queryKeys.contracts.detail(updatedContract.id), updatedContract);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

/**
 * Approve a completed contract (founder action)
 */
export function useApproveContract() {
  const queryClient = useQueryClient();

  return useMutation<Contract, GigServiceError, string>({
    mutationFn: (id) => gigService.approveContract(id),
    onSuccess: (updatedContract) => {
      queryClient.setQueryData(queryKeys.contracts.detail(updatedContract.id), updatedContract);
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.gigs.all });
    },
  });
}

// ============================================================
// MESSAGE HOOKS
// ============================================================

/**
 * Fetch contract messages
 */
export function useContractMessages(
  contractId: string | null | undefined,
  params?: MessageListParams,
  enabled = true
) {
  return useQuery<PaginatedMessages, GigServiceError>({
    queryKey: queryKeys.messages.forContract(contractId!, params),
    queryFn: () => gigService.getContractMessages(contractId!, params),
    enabled: enabled && !!contractId,
    refetchInterval: 10_000, // Poll every 10s for new messages
  });
}

/**
 * Infinite scroll contract messages
 */
export function useInfiniteContractMessages(contractId: string | null | undefined) {
  return useInfiniteQuery<PaginatedMessages, GigServiceError>({
    queryKey: ["messages", "infinite", contractId],
    queryFn: ({ pageParam }) =>
      gigService.getContractMessages(contractId!, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: !!contractId,
  });
}

/**
 * Send a message
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation<
    ContractMessage,
    GigServiceError,
    { contractId: string; payload: MessageCreateInput }
  >({
    mutationFn: ({ contractId, payload }) =>
      gigService.sendContractMessage(contractId, payload),
    onSuccess: (_data, { contractId }) => {
      // Invalidate messages for this contract
      queryClient.invalidateQueries({
        queryKey: ["messages", contractId],
      });
      // Also invalidate infinite messages
      queryClient.invalidateQueries({
        queryKey: ["messages", "infinite", contractId],
      });
    },
  });
}

/**
 * Mark messages as read
 */
export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation<void, GigServiceError, string>({
    mutationFn: (contractId) => gigService.markContractMessagesRead(contractId),
    onSuccess: (_data, contractId) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", contractId],
      });
    },
  });
}

// ============================================================
// RATING HOOKS
// ============================================================

/**
 * Submit a rating for a contract
 */
export function useSubmitRating() {
  const queryClient = useQueryClient();

  return useMutation<
    Rating,
    GigServiceError,
    { contractId: string; data: RatingCreateInput }
  >({
    mutationFn: ({ contractId, data }) => gigService.submitRating(contractId, data),
    onSuccess: (_data, { contractId }) => {
      // Invalidate contract details (rating changes contract state)
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.detail(contractId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.contracts.all });
    },
  });
}

// ============================================================
// NOTIFICATION HOOKS
// ============================================================

/**
 * Fetch user notifications
 */
export function useNotifications(filters?: NotificationFilters, enabled = true) {
  return useQuery<PaginatedNotifications, GigServiceError>({
    queryKey: queryKeys.notifications.list(filters),
    queryFn: () => gigService.getNotifications(filters),
    enabled,
    refetchInterval: 30_000, // Poll every 30s for new notifications
  });
}

// ============================================================
// USER PROFILE HOOKS
// ============================================================

/**
 * Fetch current user's profile
 */
export function useMyProfile(enabled = true) {
  return useQuery<UserProfile, GigServiceError>({
    queryKey: queryKeys.profile.me(),
    queryFn: () => gigService.getMyProfile(),
    enabled,
    staleTime: 1000 * 60 * 5, // Profile data stale after 5 min
  });
}

/**
 * Update current user's profile
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, GigServiceError, UserProfileUpsertInput>({
    mutationFn: (data) => gigService.updateMyProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKeys.profile.me(), updatedProfile);
    },
  });
}

// ============================================================
// PAGINATED HOOKS (backward compat wrapper)
// ============================================================

/**
 * Paginated gigs with a flattened interface similar to old usePaginatedGigs
 */
export function usePaginatedGigs(filters?: Omit<GigFilters, "cursor">) {
  const query = useInfiniteGigs(filters);

  const allItems = query.data?.pages.flatMap((page) => page.items) ?? [];

  return {
    data: allItems,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.error,
    hasMore: query.hasNextPage ?? false,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refresh: () => query.refetch(),
  };
}
