import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ChatComponent} from '../chat/chat.component';
import {TopologyViewComponent} from '../topology-view/topology-view.component';
import {SubagentListComponent} from '../subagent-list/subagent-list.component';
import {SubagentService} from '../../core/services/subagent.service';

interface TabInfo {
  id: string;
  label: string;
  type: 'main'|'topology'|'list'|'subagent';
  agentName?: string;
  sessionId?: string;
  status?: string;
  iframeSrc?: SafeResourceUrl;
}

@Component({
  selector: 'app-subagent-layout',
  standalone: true,
  imports: [
    CommonModule,
    ChatComponent,
    TopologyViewComponent,
    SubagentListComponent,
  ],
  template: `
    <!-- Tab bar -->
    <div class="osp-tabbar">
      <button
        *ngFor="let tab of tabs"
        class="osp-tab"
        [class.active]="tab.id === activeTabId"
        (click)="activateTab(tab.id)">
        {{ tab.label }}
        <span *ngIf="tab.type === 'subagent' && tab.status"
              class="osp-tab-badge"
              [class.badge-running]="tab.status === 'running'"
              [class.badge-completed]="tab.status === 'completed' || tab.status === 'active'"
              [class.badge-error]="tab.status === 'error' || tab.status === 'interrupted'">
          {{ tab.status }}
        </span>
        <button *ngIf="tab.type === 'subagent'"
                class="osp-tab-close"
                (click)="closeTab(tab.id, $event)">×</button>
      </button>
    </div>

    <!-- Content area -->
    <div class="osp-content">
      <!-- Main session -->
      <div class="osp-pane" [style.display]="activeTabId === 'main' ? 'block' : 'none'">
        <app-chat></app-chat>
      </div>

      <!-- Topology -->
      <div class="osp-pane" [style.display]="activeTabId === 'topology' ? 'block' : 'none'">
        <app-topology-view #topologyView (agentClicked)="openSubagentTab($event.name, $event.status)"></app-topology-view>
      </div>

      <!-- Sub-agent list -->
      <div class="osp-pane" [style.display]="activeTabId === 'list' ? 'block' : 'none'">
        <app-subagent-list (agentClicked)="openSubagentTab($event.name, $event.status)"></app-subagent-list>
      </div>

      <!-- Sub-agent iframes -->
      <div *ngFor="let tab of tabs"
           class="osp-pane"
           [style.display]="tab.id === activeTabId && tab.type === 'subagent' ? 'block' : 'none'">
        <iframe *ngIf="tab.type === 'subagent' && tab.iframeSrc"
                class="osp-iframe"
                [src]="tab.iframeSrc"
                #subagentFrame></iframe>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex; flex-direction: column;
      width: 100%; height: 100vh; overflow: hidden;
      position: fixed; top: 0; left: 0;
    }
    .osp-tabbar {
      display: flex; align-items: center; gap: 0;
      background: var(--mat-sys-surface-container, #2b2b2b);
      border-bottom: 1px solid var(--mat-sys-outline-variant, #444);
      font-family: Google Sans, Helvetica Neue, sans-serif;
      font-size: 13px; height: 38px; padding: 0 8px;
      box-shadow: 0 1px 4px rgba(0,0,0,.3);
      flex-shrink: 0; z-index: 100;
    }
    .osp-tab {
      padding: 8px 16px; border: none; background: none;
      color: var(--mat-sys-on-surface-variant, #9d9d9d);
      cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500;
      position: relative; white-space: nowrap;
      display: flex; align-items: center; gap: 6px;
      transition: color .15s;
    }
    .osp-tab:hover { color: var(--mat-sys-on-surface, #e3e3e3); }
    .osp-tab.active { color: var(--mat-sys-primary, #8ab4f8); }
    .osp-tab.active::after {
      content: ''; position: absolute; bottom: 0; left: 8px; right: 8px;
      height: 3px; border-radius: 3px 3px 0 0;
      background: var(--mat-sys-primary, #8ab4f8);
    }
    .osp-tab-badge {
      display: inline-block; padding: 1px 6px; border-radius: 8px;
      font-size: 10px; font-weight: 600;
    }
    .badge-running { background: #81c99533; color: #81c995; }
    .badge-completed { background: #8ab4f822; color: #8ab4f8; }
    .badge-error { background: #f2857522; color: #f28b82; }
    .osp-tab-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 50%; border: none; background: none;
      color: var(--mat-sys-on-surface-variant, #656565); cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0;
    }
    .osp-tab-close:hover {
      background: var(--mat-sys-surface-container, #444); color: #fff;
    }
    .osp-content {
      flex: 1; position: relative; overflow: hidden;
    }
    .osp-pane {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      overflow: auto;
      background: var(--mat-sys-surface, #1e1e1e);
    }
    .osp-iframe {
      width: 100%; height: 100%; border: none;
      background: var(--mat-sys-surface, #1e1e1e);
    }
  `],
})
export class SubagentLayoutComponent implements OnInit {
  @ViewChild('topologyView') topologyView?: TopologyViewComponent;

  tabs: TabInfo[] = [
    {id: 'main', label: 'Session', type: 'main'},
    {id: 'topology', label: 'Topology', type: 'topology'},
    {id: 'list', label: 'Sub-Agents', type: 'list'},
  ];
  activeTabId = 'main';

  private appName = '';
  private userId = 'user';

  constructor(
      private subagentService: SubagentService,
      private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // Read app/userId from URL params (Angular sets them)
    const params = new URLSearchParams(window.location.search);
    this.appName = params.get('app') || '';
    this.userId = params.get('userId') || 'user';

    // Fallback: fetch app name from API
    if (!this.appName) {
      fetch('/list-apps')
          .then(r => r.json())
          .then(d => {
            if (Array.isArray(d) && d.length > 0) this.appName = d[0];
          })
          .catch(() => {});
    }
  }

  activateTab(id: string) {
    this.activeTabId = id;
    if (id === 'topology' && this.topologyView) {
      this.topologyView.fitToCenter();
    }
  }

  closeTab(id: string, event: Event) {
    event.stopPropagation();
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    this.tabs.splice(idx, 1);
    if (this.activeTabId === id) {
      this.activeTabId = 'topology';
    }
  }

  openSubagentTab(agentName: string, status?: string) {
    const tabId = 'sub-' + agentName;
    const existing = this.tabs.find(t => t.id === tabId);

    if (existing) {
      // Refresh: reload session from traj.json then refresh iframe
      this.subagentService.loadSession(agentName).subscribe({
        next: (data) => {
          existing.status = status || existing.status || 'running';
          existing.sessionId = data.session_id;
          // Force iframe reload by resetting src
          const newSrc = this.buildIframeSrc(data.session_id);
          existing.iframeSrc = undefined;
          setTimeout(() => {
            existing.iframeSrc = newSrc;
            this.activeTabId = tabId;
          }, 50);
        },
        error: (err) => {
          console.error('[SubAgent] Failed to reload session:', err);
        },
      });
      return;
    }

    // New tab: load session then create iframe
    this.subagentService.loadSession(agentName).subscribe({
      next: (data) => {
        const iframeSrc = this.buildIframeSrc(data.session_id);
        this.tabs.push({
          id: tabId,
          label: agentName,
          type: 'subagent',
          agentName,
          sessionId: data.session_id,
          status: status || 'running',
          iframeSrc,
        });
        this.activeTabId = tabId;
      },
      error: (err) => {
        console.error('[SubAgent] Failed to load session:', err);
      },
    });
  }

  private buildIframeSrc(sessionId: string): SafeResourceUrl {
    // Read current app name (might have been set by Angular after init)
    const params = new URLSearchParams(window.location.search);
    const app = params.get('app') || this.appName;
    const uid = params.get('userId') || this.userId;
    const baseUrl = window.location.href.split('?')[0];
    const url = `${baseUrl}?app=${encodeURIComponent(app)}&session=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(uid)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
