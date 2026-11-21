import {
  Complaint,
  CreateComplaintInput,
  ComplaintStatus,
} from '../types/complaint';
import { INITIAL_COMPLAINTS } from '../data/initialComplaints';
import { aiService } from './aiService';

const STORAGE_KEY_COMPLAINTS = 'civicresolve_complaints';

export interface IComplaintService {
  getAllComplaints(): Promise<Complaint[]>;
  getComplaintById(id: string): Promise<Complaint | null>;
  getUserComplaints(userId: string): Promise<Complaint[]>;
  createComplaint(input: CreateComplaintInput, userId: string, userName: string): Promise<Complaint>;
  updateStatus(
    id: string,
    status: ComplaintStatus,
    note: string,
    updatedBy: string
  ): Promise<Complaint>;
  assignDepartment(
    id: string,
    department: string,
    note: string,
    updatedBy: string
  ): Promise<Complaint>;
  resetToSampleData(): Promise<void>;
}

class LocalStorageComplaintService implements IComplaintService {
  private getStoredComplaints(): Complaint[] {
    const raw = localStorage.getItem(STORAGE_KEY_COMPLAINTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
      return INITIAL_COMPLAINTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COMPLAINTS;
    }
  }

  private saveComplaints(complaints: Complaint[]) {
    localStorage.setItem(STORAGE_KEY_COMPLAINTS, JSON.stringify(complaints));
  }

  async getAllComplaints(): Promise<Complaint[]> {
    await new Promise((r) => setTimeout(r, 150));
    return this.getStoredComplaints().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    await new Promise((r) => setTimeout(r, 100));
    const all = this.getStoredComplaints();
    return all.find((c) => c.id === id) || null;
  }

  async getUserComplaints(userId: string): Promise<Complaint[]> {
    await new Promise((r) => setTimeout(r, 150));
    const all = this.getStoredComplaints();
    return all
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createComplaint(
    input: CreateComplaintInput,
    userId: string,
    userName: string
  ): Promise<Complaint> {
    // 1. Trigger AI Classification & Priority detection
    const aiAnalysis = await aiService.analyzeComplaint({
      title: input.title,
      description: input.description,
      location: input.location,
      selectedCategory: input.category,
    });

    const now = new Date().toISOString();
    const nextIndex = this.getStoredComplaints().length + 1042;
    const complaintId = `CR-2026-${nextIndex}`;

    const newComplaint: Complaint = {
      id: complaintId,
      userId,
      userName,
      title: input.title.trim(),
      description: input.description.trim(),
      location: input.location.trim(),
      ward: input.ward,
      latitude: typeof input.latitude === 'number' ? input.latitude : null,
      longitude: typeof input.longitude === 'number' ? input.longitude : null,
      category: input.category,
      imageUrl: input.imageUrl,
      priority: aiAnalysis.priority,
      urgencyReason: aiAnalysis.urgencyReason,
      recommendedDepartment: aiAnalysis.recommendedDepartment,
      assignedDepartment: aiAnalysis.recommendedDepartment,
      status: 'Reported',
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'Reported',
          timestamp: now,
          note: 'Civic complaint submitted by citizen with AI triage classification.',
          updatedBy: `${userName} (Citizen)`,
        },
      ],
    };

    const current = this.getStoredComplaints();
    this.saveComplaints([newComplaint, ...current]);
    return newComplaint;
  }

  async updateStatus(
    id: string,
    status: ComplaintStatus,
    note: string,
    updatedBy: string
  ): Promise<Complaint> {
    await new Promise((r) => setTimeout(r, 200));
    const complaints = this.getStoredComplaints();
    const index = complaints.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Complaint ${id} not found`);

    const current = complaints[index];
    const now = new Date().toISOString();

    const updated: Complaint = {
      ...current,
      status,
      updatedAt: now,
      statusHistory: [
        ...current.statusHistory,
        {
          status,
          timestamp: now,
          note: note.trim() || `Status updated to ${status}`,
          updatedBy,
        },
      ],
    };

    complaints[index] = updated;
    this.saveComplaints(complaints);
    return updated;
  }

  async assignDepartment(
    id: string,
    department: string,
    note: string,
    updatedBy: string
  ): Promise<Complaint> {
    await new Promise((r) => setTimeout(r, 200));
    const complaints = this.getStoredComplaints();
    const index = complaints.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Complaint ${id} not found`);

    const current = complaints[index];
    const now = new Date().toISOString();

    // If still in 'Reported' or 'Under Review', advancing to 'Assigned' is standard civic flow
    const nextStatus: ComplaintStatus =
      current.status === 'Reported' || current.status === 'Under Review'
        ? 'Assigned'
        : current.status;

    const updated: Complaint = {
      ...current,
      assignedDepartment: department,
      status: nextStatus,
      updatedAt: now,
      statusHistory: [
        ...current.statusHistory,
        {
          status: nextStatus,
          timestamp: now,
          note: note.trim() || `Department formally assigned to: ${department}`,
          updatedBy,
        },
      ],
    };

    complaints[index] = updated;
    this.saveComplaints(complaints);
    return updated;
  }

  async resetToSampleData(): Promise<void> {
    this.saveComplaints(INITIAL_COMPLAINTS);
  }
}

export const complaintService: IComplaintService = new LocalStorageComplaintService();
