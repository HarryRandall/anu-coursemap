"use client";

import { useState } from "react";
import { AlertTriangle, Trash01 } from "@untitledui/icons";
import {
  Dialog,
  Modal,
  ModalOverlay,
} from "@uui/components/application/modals/modal";
import { Button } from "@uui/components/base/buttons/button";
import { CloseButton } from "@uui/components/base/buttons/close-button";
import { Input } from "@uui/components/base/input/input";
import { Select } from "@uui/components/base/select/select";
import { TextArea } from "@uui/components/base/textarea/textarea";
import { FeaturedIcon } from "@uui/components/foundations/featured-icon/featured-icon";
import { DialogTrigger } from "react-aria-components";
import { sessions } from "../content";
import { Example, Stack, Variants } from "../section-frame";

function ConfirmModal() {
  const [confirmed, setConfirmed] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <DialogTrigger>
        <Button color="primary-destructive" iconLeading={Trash01}>
          Drop COMP2610
        </Button>

        <ModalOverlay isDismissable>
          <Modal>
            <Dialog className="w-full max-w-100">
              {({ close }) => (
                <div className="ring-secondary_alt flex flex-col gap-8 rounded-xl bg-primary p-6 shadow-xl ring-1">
                  <div className="flex items-start gap-4">
                    <FeaturedIcon
                      size="lg"
                      color="error"
                      theme="light"
                      icon={AlertTriangle}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <h2 className="text-lg font-semibold text-primary">
                        Drop COMP2610?
                      </h2>
                      <p className="text-tertiary text-sm">
                        Information Theory is planned for Semester 2, 2026.
                        Dropping it will unset the prerequisite for COMP3670.
                      </p>
                    </div>
                    <CloseButton size="sm" label="Close" />
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      size="lg"
                      color="secondary"
                      className="flex-1"
                      onClick={close}
                    >
                      Keep the course
                    </Button>
                    <Button
                      size="lg"
                      color="primary-destructive"
                      className="flex-1"
                      onClick={() => {
                        setConfirmed(new Date().toLocaleTimeString("en-AU"));
                        close();
                      }}
                    >
                      Drop it
                    </Button>
                  </div>
                </div>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      <p className="text-tertiary text-sm">
        {confirmed
          ? `COMP2610 dropped at ${confirmed}.`
          : "Nothing dropped yet. Escape or the backdrop closes without acting."}
      </p>
    </div>
  );
}

function FormModal() {
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <DialogTrigger>
        <Button>Request a variation</Button>

        <ModalOverlay isDismissable>
          <Modal>
            <Dialog className="w-full max-w-120">
              {({ close }) => (
                <form
                  className="ring-secondary_alt flex flex-col rounded-xl bg-primary shadow-xl ring-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    setSaved(String(data.get("reason") || "No reason given"));
                    close();
                  }}
                >
                  <header className="flex items-start justify-between gap-4 p-6 pb-5">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-semibold text-primary">
                        Request a variation
                      </h2>
                      <p className="text-tertiary text-sm">
                        Your adviser reviews this before it reaches the college.
                      </p>
                    </div>
                    <CloseButton size="sm" label="Close" />
                  </header>

                  <div className="flex flex-col gap-4 px-6">
                    <Input
                      name="course"
                      label="Course"
                      defaultValue="COMP3600"
                      isRequired
                    />
                    <Select
                      name="session"
                      label="Teaching period"
                      defaultSelectedKey="2027-s1"
                      items={sessions.map((s) => ({
                        id: s.id,
                        label: s.label,
                      }))}
                    >
                      {(item) => (
                        <Select.Item id={item.id}>{item.label}</Select.Item>
                      )}
                    </Select>
                    <TextArea
                      name="reason"
                      label="Reason"
                      rows={4}
                      isRequired
                      placeholder="Explain why this variation should be approved"
                    />
                  </div>

                  <footer className="flex flex-col-reverse gap-3 p-6 pt-8 sm:flex-row">
                    <Button
                      size="lg"
                      color="secondary"
                      className="flex-1"
                      onClick={close}
                    >
                      Cancel
                    </Button>
                    <Button size="lg" type="submit" className="flex-1">
                      Submit request
                    </Button>
                  </footer>
                </form>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      </DialogTrigger>

      <p className="text-tertiary text-sm">
        {saved
          ? `Submitted: "${saved}"`
          : "Nothing submitted. The form requires a reason before it will submit."}
      </p>
    </div>
  );
}

export function ModalsSection() {
  return (
    <Stack>
      <Example
        title="Destructive confirmation"
        description="Focus moves into the dialog and is trapped there. Escape or the backdrop dismisses without acting, and focus returns to the trigger."
      >
        <ConfirmModal />
      </Example>

      <Example
        title="Form dialog"
        description="A real form inside a dialog. Submitting closes it and reports the value; browser validation blocks an empty reason."
      >
        <FormModal />
      </Example>

      <Example
        title="Non-dismissable"
        description="Without isDismissable the backdrop is inert and only an explicit control closes the dialog."
      >
        <Variants>
          <DialogTrigger>
            <Button color="secondary">Blocking dialog</Button>
            <ModalOverlay>
              <Modal>
                <Dialog className="w-full max-w-100">
                  {({ close }) => (
                    <div className="ring-secondary_alt flex flex-col gap-6 rounded-xl bg-primary p-6 shadow-xl ring-1">
                      <div className="flex flex-col gap-1">
                        <h2 className="text-lg font-semibold text-primary">
                          Catalogue import running
                        </h2>
                        <p className="text-tertiary text-sm">
                          Leaving now would abandon 1,284 partially imported
                          courses. Clicking the backdrop will not close this.
                        </p>
                      </div>
                      <Button size="lg" onClick={close}>
                        Understood
                      </Button>
                    </div>
                  )}
                </Dialog>
              </Modal>
            </ModalOverlay>
          </DialogTrigger>
        </Variants>
      </Example>
    </Stack>
  );
}
