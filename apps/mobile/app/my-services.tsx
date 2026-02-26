import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { FlowScreen, SurfaceCard, T, useFlowNav, useFlowPalette } from "@/components/community/freelancerFlow/shared";
import { useMyFreelancerServices, useUpdateMyFreelancerServices } from "@/hooks/useGig";

type DraftService = {
  local_id: string;
  service_name: string;
  description: string;
  cost_amount: string;
  delivery_time_value: string;
  delivery_time_unit: "days" | "weeks";
  is_active: boolean;
};

function emptyDraft(): DraftService {
  return {
    local_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    service_name: "",
    description: "",
    cost_amount: "",
    delivery_time_value: "",
    delivery_time_unit: "days",
    is_active: true,
  };
}

export default function MyServicesScreen() {
  const { palette } = useFlowPalette();
  const nav = useFlowNav();
  const { data: services = [], isLoading, refetch } = useMyFreelancerServices(true);
  const updateServices = useUpdateMyFreelancerServices();
  const [drafts, setDrafts] = useState<DraftService[]>([emptyDraft()]);

  useEffect(() => {
    if (!services.length) return;
    setDrafts(
      services.map((service) => ({
        local_id: service.id,
        service_name: service.service_name || "",
        description: service.description || "",
        cost_amount: String(Math.round(Number(service.cost_amount || 0))),
        delivery_time_value: String(service.delivery_time_value || ""),
        delivery_time_unit: service.delivery_time_unit || "days",
        is_active: service.is_active !== false,
      })),
    );
  }, [services]);

  const invalidRows = useMemo(
    () =>
      drafts.filter((row) =>
        !row.service_name.trim() ||
        Number.isNaN(Number(row.cost_amount)) ||
        Number(row.cost_amount) < 0 ||
        Number.isNaN(Number(row.delivery_time_value)) ||
        Number(row.delivery_time_value) <= 0,
      ).length,
    [drafts],
  );

  const canSave = drafts.length > 0 && invalidRows === 0 && !updateServices.isPending;

  const patchDraft = (localId: string, patch: Partial<DraftService>) => {
    setDrafts((prev) => prev.map((row) => (row.local_id === localId ? { ...row, ...patch } : row)));
  };

  const addDraft = () => {
    setDrafts((prev) => [...prev, emptyDraft()]);
  };

  const removeDraft = (localId: string) => {
    setDrafts((prev) => {
      const next = prev.filter((row) => row.local_id !== localId);
      return next.length > 0 ? next : [emptyDraft()];
    });
  };

  const onSave = async () => {
    if (!canSave) {
      Alert.alert("Incomplete details", "Please fill service name, cost, and delivery time for all rows.");
      return;
    }

    try {
      await updateServices.mutateAsync({
        services: drafts.map((row) => ({
          service_name: row.service_name.trim(),
          description: row.description.trim() || null,
          cost_amount: Number(row.cost_amount),
          delivery_time_value: Math.max(1, Math.trunc(Number(row.delivery_time_value))),
          delivery_time_unit: row.delivery_time_unit,
          is_active: row.is_active,
          cost_currency: "INR",
        })),
      });

      await refetch();
      Alert.alert("Saved", "Your services are updated.");
      nav.back();
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save services");
    }
  };

  return (
    <FlowScreen scroll={false}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.bg }]}> 
        <View style={{ flex: 1 }}>
          <T weight="medium" color={palette.text} style={styles.title}>My Services</T>
          <T weight="regular" color={palette.subText} style={styles.subtitle}>Set service, price, and delivery time</T>
        </View>
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: canSave ? palette.accentSoft : palette.border,
              borderColor: canSave ? palette.accent : palette.borderLight,
            },
          ]}
          disabled={!canSave}
          onPress={onSave}
        >
          {updateServices.isPending ? (
            <ActivityIndicator size="small" color={palette.accent} />
          ) : (
            <T weight="medium" color={canSave ? palette.accent : palette.subText} style={styles.saveText}>Save</T>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
        ) : (
          <>
            {drafts.map((draft, index) => (
              <SurfaceCard key={draft.local_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <T weight="medium" color={palette.text} style={styles.cardTitle}>Service {index + 1}</T>
                  <TouchableOpacity onPress={() => removeDraft(draft.local_id)}>
                    <Ionicons name="trash-outline" size={16} color={palette.subText} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Service name"
                  placeholderTextColor={palette.subText}
                  style={[styles.input, { color: palette.text, borderColor: palette.borderLight, backgroundColor: palette.bg }]}
                  value={draft.service_name}
                  onChangeText={(value) => patchDraft(draft.local_id, { service_name: value })}
                />

                <TextInput
                  placeholder="Service overview"
                  placeholderTextColor={palette.subText}
                  multiline
                  style={[
                    styles.input,
                    styles.inputArea,
                    { color: palette.text, borderColor: palette.borderLight, backgroundColor: palette.bg },
                  ]}
                  value={draft.description}
                  onChangeText={(value) => patchDraft(draft.local_id, { description: value })}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <T weight="regular" color={palette.subText} style={styles.label}>Cost (INR)</T>
                    <TextInput
                      placeholder="0"
                      placeholderTextColor={palette.subText}
                      keyboardType="numeric"
                      style={[styles.input, { color: palette.text, borderColor: palette.borderLight, backgroundColor: palette.bg }]}
                      value={draft.cost_amount}
                      onChangeText={(value) => patchDraft(draft.local_id, { cost_amount: value.replace(/[^0-9.]/g, "") })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T weight="regular" color={palette.subText} style={styles.label}>Delivery</T>
                    <View style={styles.deliveryRow}>
                      <TextInput
                        placeholder="7"
                        placeholderTextColor={palette.subText}
                        keyboardType="numeric"
                        style={[
                          styles.input,
                          styles.deliveryValue,
                          { color: palette.text, borderColor: palette.borderLight, backgroundColor: palette.bg },
                        ]}
                        value={draft.delivery_time_value}
                        onChangeText={(value) => patchDraft(draft.local_id, { delivery_time_value: value.replace(/[^0-9]/g, "") })}
                      />
                      <View style={styles.unitToggleWrap}>
                        {(["days", "weeks"] as const).map((unit) => {
                          const active = draft.delivery_time_unit === unit;
                          return (
                            <TouchableOpacity
                              key={unit}
                              style={[
                                styles.unitToggle,
                                {
                                  borderColor: active ? palette.accent : palette.borderLight,
                                  backgroundColor: active ? palette.accentSoft : palette.surface,
                                },
                              ]}
                              onPress={() => patchDraft(draft.local_id, { delivery_time_unit: unit })}
                            >
                              <T weight="medium" color={active ? palette.accent : palette.subText} style={styles.unitText}>
                                {unit}
                              </T>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              </SurfaceCard>
            ))}

            <TouchableOpacity
              style={[styles.addBtn, { borderColor: palette.borderLight, backgroundColor: palette.surface }]}
              activeOpacity={0.85}
              onPress={addDraft}
            >
              <Ionicons name="add-circle-outline" size={16} color={palette.accent} />
              <T weight="medium" color={palette.accent} style={styles.addText}>Add service</T>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
  saveBtn: {
    minWidth: 64,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  saveText: {
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 10,
  },
  loaderWrap: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  inputArea: {
    minHeight: 74,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  label: {
    marginBottom: 4,
    fontSize: 10,
    lineHeight: 13,
  },
  deliveryRow: {
    gap: 6,
  },
  deliveryValue: {
    width: "100%",
  },
  unitToggleWrap: {
    flexDirection: "row",
    gap: 6,
  },
  unitToggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unitText: {
    fontSize: 10,
    lineHeight: 13,
  },
  addBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
