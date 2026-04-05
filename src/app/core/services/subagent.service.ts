import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {URLUtil} from '../../../utils/url-util';

export interface SubagentInfo {
  name: string;
  session_id: string;
  dir: string;
  parent_name: string;
  has_traj: boolean;
  query: string;
  status: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  name: string;
  session_id: string;
  query: string;
  status: string;
  type: string;
}

export interface TopologyEdge {
  from: string;
  to: string;
}

export interface SubagentListResponse {
  agents: SubagentInfo[];
  root: string;
}

export interface TopologyResponse {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface LoadSessionResponse {
  session_id: string;
  agent_name: string;
  subagent_session_id: string;
  event_count: number;
}

@Injectable({providedIn: 'root'})
export class SubagentService {
  private baseUrl = URLUtil.getApiServerBaseUrl();

  constructor(private http: HttpClient) {}

  listSubagents(): Observable<SubagentListResponse> {
    return this.http.get<SubagentListResponse>(
        `${this.baseUrl}/control/subagents`);
  }

  getTopology(): Observable<TopologyResponse> {
    return this.http.get<TopologyResponse>(
        `${this.baseUrl}/control/subagents/topology`);
  }

  loadSession(subagentSessionId: string): Observable<LoadSessionResponse> {
    return this.http.post<LoadSessionResponse>(
        `${this.baseUrl}/control/subagents/${encodeURIComponent(subagentSessionId)}/load_session`,
        null);
  }
}
