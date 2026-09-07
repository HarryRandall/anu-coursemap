type Result = { mark?: number; resultCode?: string; units?: number };

export function formatPreviewMark(mark: number) {
  return Number(mark.toFixed(1)).toString();
}

// Preview fixtures are six-unit courses unless an explicit unit load is supplied.
export function previewWam(results: Result[]) {
  const marked = results.filter((result) => result.mark !== undefined);
  const units = marked.reduce((sum, result) => sum + (result.units ?? 6), 0);
  return units
    ? marked.reduce(
        (sum, result) => sum + result.mark! * (result.units ?? 6),
        0,
      ) / units
    : null;
}

// ANU: https://www.anu.edu.au/students/program-administration/assessments-exams/grade-point-average-gpa
export function previewGpa(results: Result[]) {
  const included = results.flatMap((result) => {
    let points: number;
    if (result.resultCode === "PS") points = 4;
    else if (result.resultCode === "NCN" || result.resultCode === "WN")
      points = 0;
    else if (result.resultCode || result.mark === undefined) return [];
    else
      points =
        result.mark >= 80
          ? 7
          : result.mark >= 70
            ? 6
            : result.mark >= 60
              ? 5
              : result.mark >= 50
                ? 4
                : 0;
    return [{ points, units: result.units ?? 6 }];
  });
  const units = included.reduce((sum, result) => sum + result.units, 0);
  return units
    ? included.reduce((sum, result) => sum + result.points * result.units, 0) /
        units
    : null;
}
