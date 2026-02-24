export {
  // Query keys (for custom invalidation)
  queryKeys,
  // Gig hooks
  useGigs,
  useMyGigs,
  useGig,
  useInfiniteGigs,
  useCreateGig,
  useUpdateGig,
  useDeleteGig,
  // Stats
  useFreelancerStats,
  // Proposals
  useGigProposals,
  useMyProposals,
  useSubmitProposal,
  useAcceptProposal,
  useRejectProposal,
  // Contracts
  useContracts,
  useContract,
  useCompleteContract,
  useApproveContract,
  // Messages
  useContractMessages,
  useInfiniteContractMessages,
  useSendMessage,
  useMarkMessagesRead,
  // Ratings
  useSubmitRating,
  // Notifications
  useNotifications,
  // User Profile
  useMyProfile,
  useUpdateMyProfile,
  // Backward compat
  usePaginatedGigs,
} from "./useGig";
