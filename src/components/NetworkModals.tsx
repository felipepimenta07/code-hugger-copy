import React from 'react';
import { PathFinderModal } from './PathFinderModal';
import { QuickActionsMenu } from './QuickActionsMenu';
import { NodeCreationModal } from './NodeCreationModal';
import { FlowManagerPanel } from './FlowManagerPanel';
import { LinkedInImportModal } from './LinkedInImportModal';
import { DuplicateCheckDialog } from './DuplicateCheckDialog';
import { AIInsightsPanel } from './AIInsightsPanel';
import { AIConnectionModal } from './AIConnectionModal';
import { OpportunitiesPanel } from './OpportunitiesPanel';
import { ContextMenu } from './ContextMenu';

interface NetworkModalsProps {
  contextMenu: any;
  updateState: (updates: any) => void;
  viewMode: string;
  onContextCreateNode: () => void;

  showPathFinder: boolean;
  setShowPathFinder: (show: boolean) => void;
  pathStart: any;
  pathEnd: any;
  setPathStart: (n: any) => void;
  setPathEnd: (n: any) => void;
  setHighlightedPath: (path: number[]) => void;
  nodes: any[];
  connections: any[];

  showQuickActions: boolean;
  setShowQuickActions: (show: boolean) => void;
  onAutoOrganize: () => void;
  onFitToScreen: () => void;
  onExport: () => void;

  showNodeCreationModal: boolean;
  setShowNodeCreationModal: (show: boolean) => void;
  editingNodeInModal: any;
  setEditingNodeInModal: (n: any) => void;
  getAllCategories: (type: string) => string[];
  onCreateNode: (data: any) => void;
  onUpdateNode: (data: any) => void;
  isCreatingFlow: boolean;
  setIsCreatingFlowRoot: (v: boolean) => void;

  showFlowsManager: boolean;
  setShowFlowsManager: (show: boolean) => void;
  flowsForManager: any[];
  onSelectFlow: (flowId: number) => void;
  onDeleteFlow: (flowId: number) => void;

  showLinkedInImport: boolean;
  setShowLinkedInImport: (show: boolean) => void;
  onLinkedInImport: (data: any, options: any) => void;
  projects: any[];

  duplicateCheckModal: any;
  onDuplicateConfirmSame: () => void;
  onDuplicateConfirmDifferent: () => void;
  onDuplicateCancel: () => void;

  showAIInsights: boolean;
  setShowAIInsights: (show: boolean) => void;
  allNodes: any[];
  allConnections: any[];
  workflows: any[];
  flows: any[];
  people: any[];
  brands: any[];
  onHighlightPath: (ids: number[]) => void;
  onFocusNode: (id: number) => void;
  onOpenConnectionModal: (conn: any, nodes: any[], type: string) => void;

  aiConnectionModal: any;
  setAiConnectionModal: (m: any) => void;
  onAiConnectionFocusNode: (id: number) => void;

  showOpportunities: boolean;
  setShowOpportunities: (show: boolean) => void;
  onSelectOpportunityNode: (id: number) => void;

  showSidebar: boolean;
  editingNode: any;
  addCustomCategory: (type: string, cat: string) => boolean;
  onNodeEditorUpdate: (field: string, value: any) => void;
  onNodeEditorClose: () => void;
  onNodeEditorDelete: () => void;
  onNodeEditorConfirm: () => void;
}

export const NetworkModals: React.FC<NetworkModalsProps> = (props) => {
  return (
    <>
      {props.contextMenu && (
        <ContextMenu
          contextMenu={props.contextMenu}
          updateState={props.updateState}
          viewMode={props.viewMode}
          onCreateNode={props.onContextCreateNode}
        />
      )}

      {props.showPathFinder && (
        <PathFinderModal
          nodes={props.nodes}
          connections={props.connections}
          pathStart={props.pathStart}
          pathEnd={props.pathEnd}
          setPathStart={props.setPathStart}
          setPathEnd={props.setPathEnd}
          setShowPathFinder={props.setShowPathFinder}
          setHighlightedPath={props.setHighlightedPath}
        />
      )}

      {props.showQuickActions && (
        <QuickActionsMenu
          setShowQuickActions={props.setShowQuickActions}
          onAutoOrganize={props.onAutoOrganize}
          onShowPathFinder={() => props.setShowPathFinder(true)}
          onFitToScreen={props.onFitToScreen}
          onExport={props.onExport}
        />
      )}

      {props.showNodeCreationModal && (
        <NodeCreationModal
          getAllCategories={props.getAllCategories}
          onClose={() => {
            props.setShowNodeCreationModal(false);
            props.setEditingNodeInModal(null);
            props.setIsCreatingFlowRoot(false);
          }}
          onCreate={props.editingNodeInModal ? props.onUpdateNode : props.onCreateNode}
          editingNode={props.editingNodeInModal}
          isCreatingFlow={props.isCreatingFlow}
          defaultType={props.editingNodeInModal?.type}
        />
      )}

      {props.showFlowsManager && (
        <FlowManagerPanel
          open={props.showFlowsManager}
          onOpenChange={props.setShowFlowsManager}
          flows={props.flowsForManager}
          onSelectFlow={props.onSelectFlow}
          onDeleteFlow={props.onDeleteFlow}
        />
      )}

      {props.showLinkedInImport && (
        <LinkedInImportModal
          open={props.showLinkedInImport}
          onOpenChange={props.setShowLinkedInImport}
          onImport={props.onLinkedInImport}
          projects={props.projects}
        />
      )}

      {props.duplicateCheckModal && (
        <DuplicateCheckDialog
          open={props.duplicateCheckModal.show}
          existingNode={props.duplicateCheckModal.existingNode}
          nodeType={props.duplicateCheckModal.nodeType}
          onConfirmSame={props.onDuplicateConfirmSame}
          onConfirmDifferent={props.onDuplicateConfirmDifferent}
          onCancel={props.onDuplicateCancel}
        />
      )}

      {props.showAIInsights && (
        <AIInsightsPanel
          nodes={props.allNodes}
          connections={props.allConnections}
          workflows={props.workflows}
          flows={props.flows}
          people={props.people}
          brands={props.brands}
          projects={props.projects}
          onHighlightPath={props.onHighlightPath}
          onFocusNode={props.onFocusNode}
          onClose={() => props.setShowAIInsights(false)}
          onOpenConnectionModal={props.onOpenConnectionModal}
        />
      )}

      {props.aiConnectionModal && (
        <AIConnectionModal
          connection={props.aiConnectionModal.connection}
          involvedNodes={props.aiConnectionModal.nodes}
          connectionType={props.aiConnectionModal.type}
          onClose={() => props.setAiConnectionModal(null)}
          onFocusNode={props.onAiConnectionFocusNode}
        />
      )}

      <OpportunitiesPanel
        isOpen={props.showOpportunities}
        onClose={() => props.setShowOpportunities(false)}
        people={props.people}
        brands={props.brands}
        projects={props.projects}
        connections={props.allConnections}
        onSelectNode={props.onSelectOpportunityNode}
      />

      <Drawer open={props.showSidebar && props.editingNode !== null} onOpenChange={(open) => {
        if (!open) props.onNodeEditorClose();
      }}>
        <DrawerContent className="h-[90vh]">
          {props.editingNode && (
            <NodeEditor
              node={props.editingNode}
              getAllCategories={props.getAllCategories}
              addCustomCategory={props.addCustomCategory}
              onUpdate={props.onNodeEditorUpdate}
              onClose={props.onNodeEditorClose}
              onDelete={props.onNodeEditorDelete}
              onConfirm={props.onNodeEditorConfirm}
            />
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};
