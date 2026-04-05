import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SubagentService, TopologyNode} from '../../core/services/subagent.service';

declare const vis: any;

@Component({
  selector: 'app-topology-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="topology-container" #networkContainer></div>
    <div class="topology-empty" *ngIf="isEmpty">No sub-agents spawned yet</div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    .topology-container { width: 100%; height: 100%; }
    .topology-empty {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: var(--mat-sys-on-surface-variant, #656565);
      font-size: 14px;
    }
  `],
})
export class TopologyViewComponent implements OnInit, OnDestroy {
  @ViewChild('networkContainer', {static: true}) containerRef!: ElementRef;
  @Output() agentClicked = new EventEmitter<{name: string; status: string}>();

  isEmpty = true;
  private network: any = null;
  private lastHash = '';
  private refreshInterval: any = null;
  private nodes: TopologyNode[] = [];

  constructor(private subagentService: SubagentService) {}

  ngOnInit() {
    this.refresh();
    this.refreshInterval = setInterval(() => this.refresh(), 5000);
  }

  /** Call when the topology tab becomes visible so the network recenters. */
  fitToCenter() {
    if (this.network) {
      setTimeout(() => {
        this.network.redraw();
        this.network.fit({animation: {duration: 300, easingFunction: 'easeInOutQuad'}});
      }, 50);
    }
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.network) this.network.destroy();
  }

  refresh() {
    this.subagentService.getTopology().subscribe({
      next: (data) => {
        if (!data.nodes || data.nodes.length <= 1) {
          this.isEmpty = true;
          if (this.network) {
            this.network.destroy();
            this.network = null;
          }
          this.lastHash = 'empty';
          return;
        }

        const newHash = JSON.stringify(data.nodes.map(n => n.id + n.status)) +
            JSON.stringify(data.edges);
        if (newHash === this.lastHash && this.network) return;
        this.lastHash = newHash;
        this.isEmpty = false;
        this.nodes = data.nodes;

        if (typeof vis === 'undefined') {
          this.renderFallback(data);
          return;
        }

        const colorMap: Record<string, string> = {
          active: '#8ab4f8',
          running: '#81c995',
          completed: '#5f9dff',
          error: '#f28b82',
        };

        const visNodes = data.nodes.map(n => ({
          id: n.id,
          label: n.label,
          color: {
            background: colorMap[n.status] || '#656565',
            border: 'transparent',
            highlight: {background: '#ffe665', border: '#ffe665'},
          },
          font: {color: '#fff', size: 14, face: 'Google Sans, sans-serif'},
          shape: n.type === 'root' ? 'diamond' : 'box',
          borderWidth: 0,
          borderWidthSelected: 2,
          margin: {top: 10, bottom: 10, left: 14, right: 14},
        }));

        const visEdges = data.edges.map(e => ({
          from: e.from,
          to: e.to,
          arrows: {to: {enabled: true, scaleFactor: 0.6}},
          color: {color: '#4d4d4d', highlight: '#8ab4f8'},
          width: 2,
          smooth: {type: 'cubicBezier', roundness: 0.4},
        }));

        if (this.network) this.network.destroy();
        this.network = new vis.Network(
            this.containerRef.nativeElement,
            {nodes: visNodes, edges: visEdges},
            {
              layout: {
                hierarchical: {
                  direction: 'UD',
                  sortMethod: 'directed',
                  levelSeparation: 80,
                  nodeSpacing: 120,
                },
              },
              physics: false,
              interaction: {hover: true, zoomView: true, dragView: true},
            },
        );

        this.network.once('stabilized', () => {
          this.network.fit({animation: {duration: 300, easingFunction: 'easeInOutQuad'}});
        });

        this.network.on('click', (params: any) => {
          if (params.nodes.length === 1) {
            const nd = data.nodes.find(n => n.id === params.nodes[0]);
            if (nd && nd.type !== 'root') {
              this.agentClicked.emit({name: nd.name, status: nd.status});
            }
          }
        });
      },
      error: () => {
        this.isEmpty = true;
      },
    });
  }

  private renderFallback(data: any) {
    const colorMap: Record<string, string> = {
      active: '#8ab4f8',
      running: '#81c995',
      completed: '#5f9dff',
      error: '#f28b82',
    };
    let html = '<div style="padding:24px;font-family:monospace;font-size:13px;white-space:pre;color:#b2b2b2">';
    for (const n of data.nodes) {
      const pre = n.type === 'root' ? '' : '  └─ ';
      const dot = n.status === 'running' ? '●' : n.status === 'completed' ? '◆' : '○';
      const sc = colorMap[n.status] || '#656565';
      html += `${pre}<span style="color:${sc};cursor:${n.type === 'root' ? 'default' : 'pointer'}">${dot} ${n.label}</span>\n`;
    }
    html += '</div>';
    this.containerRef.nativeElement.innerHTML = html;
  }
}
