import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SubagentInfo, SubagentService} from '../../core/services/subagent.service';

@Component({
  selector: 'app-subagent-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="list-container">
      <div class="empty" *ngIf="agents.length === 0">No sub-agents created yet</div>
      <div class="agent-item" *ngFor="let a of agents" (click)="onAgentClick(a)">
        <div class="agent-header">
          <span class="agent-name">{{ a.name }}</span>
          <span class="agent-badge" [class]="'badge-' + a.status">{{ a.status }}</span>
        </div>
        <div class="agent-meta" *ngIf="a.parent_name">called by {{ a.parent_name }}</div>
        <div class="agent-query" *ngIf="a.query">{{ a.query }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow: auto; }
    .list-container { padding: 8px 0; }
    .empty {
      color: var(--mat-sys-on-surface-variant, #656565);
      text-align: center; padding: 48px 24px; font-size: 14px;
    }
    .agent-item {
      padding: 12px 20px;
      border-bottom: 1px solid var(--mat-sys-outline-variant, #333);
      cursor: pointer;
      transition: background .1s;
    }
    .agent-item:hover { background: var(--mat-sys-surface-container, #2b2b2b); }
    .agent-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .agent-name { font-weight: 500; }
    .agent-badge {
      display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 500;
    }
    .badge-running { background: #81c99533; color: #81c995; border: 1px solid #81c99544; }
    .badge-completed { background: #8ab4f822; color: #8ab4f8; border: 1px solid #8ab4f844; }
    .badge-active { background: #8ab4f822; color: #8ab4f8; border: 1px solid #8ab4f844; }
    .badge-error { background: #f2857522; color: #f28b82; border: 1px solid #f28b8244; }
    .agent-meta {
      color: var(--mat-sys-on-surface-variant, #656565);
      font-size: 12px; margin-top: 2px;
    }
    .agent-query {
      color: var(--mat-sys-on-surface-variant, #9d9d9d);
      font-size: 12px; margin-top: 3px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
  `],
})
export class SubagentListComponent implements OnInit, OnDestroy {
  @Output() agentClicked = new EventEmitter<{name: string; status: string}>();

  agents: SubagentInfo[] = [];
  private refreshInterval: any = null;

  constructor(private subagentService: SubagentService) {}

  ngOnInit() {
    this.refresh();
    this.refreshInterval = setInterval(() => this.refresh(), 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  refresh() {
    this.subagentService.listSubagents().subscribe({
      next: (data) => {
        this.agents = data.agents || [];
      },
      error: () => {},
    });
  }

  onAgentClick(agent: SubagentInfo) {
    this.agentClicked.emit({name: agent.name, status: agent.status});
  }
}
