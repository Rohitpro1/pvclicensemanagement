import { useState } from "react";
import { Plus, Pencil, Trash2, ArrowUpCircle, Archive, AlertTriangle } from "lucide-react";
import { useDB } from "../lib/hooks";
import { createUpdate, updateUpdate, deleteUpdate, publishUpdate, archiveUpdate } from "../lib/store";
import type { SoftwareUpdate } from "../lib/types";
import { Button, Card, Modal, Field, inputCls, Toggle } from "../components/ui";

export function Updates() {
  const db = useDB();
  const [editing, setEditing] = useState<SoftwareUpdate | null>(null);
  const [creating, setCreating] = useState(false);

  // Fallback to empty list if undefined
  const updatesList = db.updates ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Manage application releases. Publish updates, flag them as mandatory, and edit release notes.
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Release
        </Button>
      </div>

      <div className="space-y-4">
        {updatesList.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <ArrowUpCircle className="h-12 w-12 text-slate-300 mb-3" />
            <p className="font-medium text-slate-600">No releases created yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a draft version to start managing software updates.</p>
          </Card>
        ) : (
          updatesList.map((u) => {
            const isDraft = u.status === "draft";
            const isPublished = u.status === "published";
            const isArchived = u.status === "archived";

            return (
              <Card key={u.id} className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-900">v{u.version}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isArchived
                            ? "bg-slate-100 text-slate-600 border border-slate-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {u.status.toUpperCase()}
                      </span>
                      {u.mandatory && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" /> Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {isPublished && u.published_at
                        ? `Published on ${new Date(u.published_at).toLocaleString()}`
                        : `Created on ${new Date(u.created_at).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isDraft && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => {
                          if (confirm(`Publish version ${u.version} now?`)) {
                            publishUpdate(u.id);
                          }
                        }}
                      >
                        Publish Release
                      </Button>
                    )}
                    {isPublished && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (confirm(`Archive version ${u.version}?`)) {
                            archiveUpdate(u.id);
                          }
                        }}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" /> Archive
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setEditing(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        if (confirm(`Delete release v${u.version}?`)) {
                          deleteUpdate(u.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Download URL</span>
                    <a
                      href={u.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:underline truncate block"
                    >
                      {u.download_url}
                    </a>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">SHA-256 Checksum</span>
                    <span className="text-sm font-mono text-slate-700 truncate block select-all">
                      {u.sha256 || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block uppercase">Min Supported Version</span>
                    <span className="text-sm font-medium text-slate-700">
                      {u.minimum_supported_version ? `v${u.minimum_supported_version}` : "Any"}
                    </span>
                  </div>
                </div>

                {u.release_notes && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <span className="text-xs font-semibold text-slate-400 block uppercase mb-1">Release Notes</span>
                    <pre className="text-xs font-sans text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200/60 whitespace-pre-wrap">
                      {u.release_notes}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {(creating || editing) && (
        <UpdateModal
          update={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function UpdateModal({ update, onClose }: { update: SoftwareUpdate | null; onClose: () => void }) {
  const [version, setVersion] = useState(update?.version ?? "");
  const [downloadUrl, setDownloadUrl] = useState(update?.download_url ?? "");
  const [sha256, setSha256] = useState(update?.sha256 ?? "");
  const [releaseNotes, setReleaseNotes] = useState(update?.release_notes ?? "");
  const [mandatory, setMandatory] = useState(update?.mandatory ?? false);
  const [minVersion, setMinVersion] = useState(update?.minimum_supported_version ?? "");

  const save = () => {
    const payload = {
      version,
      release_notes: releaseNotes,
      download_url: downloadUrl,
      sha256,
      mandatory,
      minimum_supported_version: minVersion,
    };

    if (update) {
      updateUpdate(update.id, payload);
    } else {
      createUpdate(payload);
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={update ? "Edit Release Metadata" : "Create New Release Metadata"} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Version Tag (e.g. 2.1.0)">
          <input className={inputCls} value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.1.0" />
        </Field>
        <Field label="Minimum Supported Version">
          <input className={inputCls} value={minVersion} onChange={(e) => setMinVersion(e.target.value)} placeholder="2.0.0" />
        </Field>
        <div className="col-span-2">
          <Field label="Download URL">
            <input className={inputCls} value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://..." />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="SHA-256 Checksum">
            <input className={inputCls} value={sha256} onChange={(e) => setSha256(e.target.value)} placeholder="Hash" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Release Notes">
            <textarea
              className={`${inputCls} h-24 font-sans`}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Features added, bugs fixed..."
            />
          </Field>
        </div>
      </div>
      <div className="mt-5 border-t border-slate-100 pt-4">
        <Toggle
          label="Mark this update as Mandatory"
          hint="Mandatory updates will lock older client version features until updated."
          checked={mandatory}
          onChange={setMandatory}
        />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!version || !downloadUrl}>{update ? "Save Changes" : "Create Draft"}</Button>
      </div>
    </Modal>
  );
}
