import { useState, useEffect } from "react";
import { Node } from "reactflow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getNodeTypeConfig } from "@/lib/node-types";

interface NodeEditDialogProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, data: Partial<Node["data"]>) => void;
}

export default function NodeEditDialog({ node, isOpen, onClose, onSave }: NodeEditDialogProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (node) {
      setFormData({ ...node.data });
    }
  }, [node]);

  if (!node) return null;

  const config = getNodeTypeConfig(node.data.nodeType);
  const isChannel = config.isChannel;

  const handleSave = () => {
    onSave(node.id, formData);
    onClose();
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Node Properties</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Node Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          {isChannel && (
            <div>
              <Label htmlFor="spend">Marketing Spend ($)</Label>
              <Input
                id="spend"
                type="number"
                value={formData.spend || ""}
                onChange={(e) => updateField("spend", parseInt(e.target.value) || 0)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="coefficient">Effect Coefficient</Label>
            <Input
              id="coefficient"
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={formData.coefficient || ""}
              onChange={(e) => updateField("coefficient", parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label>Confidence Level ({formData.confidence || 0}%)</Label>
            <Slider
              value={[formData.confidence || 0]}
              onValueChange={(value) => updateField("confidence", value[0])}
              max={100}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="saturation">Saturation Curve</Label>
            <Select
              value={formData.saturation || "diminishing"}
              onValueChange={(value) => updateField("saturation", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="diminishing">Diminishing Returns</SelectItem>
                <SelectItem value="s-curve">S-Curve</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
