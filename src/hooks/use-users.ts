import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, type UserCreatePayload, type UserUpdatePayload } from "@/lib/api";

export function useUsers(params?: { search?: string; role?: string; page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.list(params),
    enabled: params !== undefined,
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ["users", "admins"],
    queryFn: () => usersApi.listAdmins(),
  });
}

export function useMyAssistants(enabled = true) {
  return useQuery({
    queryKey: ["users", "my-assistants"],
    queryFn: () => usersApi.listMyAssistants(),
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreatePayload) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdatePayload }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAddAssistant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreatePayload) => usersApi.addAssistant(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
