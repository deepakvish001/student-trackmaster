
import { rdServiceClient } from '@/services/rdServiceClient';

export const isRDServiceAvailable = async (): Promise<boolean> => {
  try {
    return await rdServiceClient.isServiceAvailable();
  } catch (error) {
    console.warn('MFS100 service availability check failed:', error);
    return false;
  }
};

export const shouldSkipFingerprintValidation = async (): Promise<boolean> => {
  const isAvailable = await isRDServiceAvailable();
  return !isAvailable;
};
