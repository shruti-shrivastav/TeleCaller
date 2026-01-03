// src/modals/bulk-upload-result-modal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAtom } from "jotai";
import { bulkUploadResultAtom } from "./jotai/leads-modal-atom";


export const BulkUploadResultModal = () => {
  const [state, setState] = useAtom(bulkUploadResultAtom);

  if (!state.result) return null;
  const { inserted, failed, errors = [] } = state.result;

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => setState({ open, result: state.result })}
    >
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Summary</DialogTitle>
        </DialogHeader>

        <div className="text-sm space-y-3">
          <p>
            <strong>{inserted}</strong> inserted &nbsp;|&nbsp;
            <strong>{failed}</strong> failed
          </p>

          {errors.length > 0 ? (
            <div className="border rounded-md p-3 bg-muted/30">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b font-medium">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Mobile</th>
                    <th className="p-2 text-left">Executive</th>
                    <th className="p-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((e: any, i: number) => (
                    <tr key={i} className="border-b last:border-none">
                      <td className="p-2">{e.row.serial_number}</td>
                      <td className="p-2">{e.row.name}</td>
                      <td className="p-2">{e.row.mobile_number}</td>
                      <td className="p-2">{e.row.executive_email}</td>
                      <td className="p-2 text-red-600">{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-green-600">All rows inserted successfully 🎉</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => setState({ open: false, result: null })}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};