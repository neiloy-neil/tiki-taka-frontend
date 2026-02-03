import { useState } from 'react';
import { venueApi } from '../services/api';

type TemplateType = 'theater' | 'stadium' | 'general_admission';

type TheaterSection = {
  sectionCode: string;
  name: string;
  rows: number;
  seatsPerRow: number;
  startX: number;
  startY: number;
  seatSpacing: number;
  rowSpacing: number;
  hasAisle?: boolean;
  aislePosition?: 'center';
};

const defaultTheaterSections: TheaterSection[] = [
  {
    sectionCode: 'A',
    name: 'Orchestra',
    rows: 6,
    seatsPerRow: 12,
    startX: 80,
    startY: 120,
    seatSpacing: 6,
    rowSpacing: 10,
    hasAisle: true,
    aislePosition: 'center',
  },
  {
    sectionCode: 'B',
    name: 'Mezzanine',
    rows: 4,
    seatsPerRow: 10,
    startX: 80,
    startY: 320,
    seatSpacing: 6,
    rowSpacing: 10,
  },
];

export const AdminVenueCreator = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    templateType: 'theater' as TemplateType,
    sections: defaultTheaterSections,
  });

  const updateSection = (index: number, field: keyof TheaterSection, value: string | number | boolean) => {
    setFormData((prev) => {
      const nextSections = [...(prev.sections as TheaterSection[])];
      nextSections[index] = { ...nextSections[index], [field]: value };
      return { ...prev, sections: nextSections };
    });
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const response = await venueApi.generatePreview({
        templateType: formData.templateType,
        sections: formData.sections,
      });
      setPreviewSvg(response.data.seatMapSvg);
      setStep(3);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      await venueApi.createVenueFromTemplate({
        name: formData.name || 'New Venue',
        address: formData.address,
        templateConfig: {
          templateType: formData.templateType,
          sections: formData.sections,
        },
      });
      alert('Venue created successfully');
      setStep(1);
      setPreviewSvg('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h3>Create a venue from template</h3>
          </div>
          <div className="stepper">Step {step} of 3</div>
        </div>

        {step === 1 && (
          <div className="admin-grid">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Downtown Theater"
              />
            </label>
            <label className="field">
              <span>Street</span>
              <input
                type="text"
                value={formData.address.street}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
                placeholder="123 Main St"
              />
            </label>
            <label className="field">
              <span>City</span>
              <input
                type="text"
                value={formData.address.city}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                placeholder="Austin"
              />
            </label>
            <label className="field">
              <span>State</span>
              <input
                type="text"
                value={formData.address.state}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                placeholder="TX"
              />
            </label>
            <label className="field">
              <span>Zip</span>
              <input
                type="text"
                value={formData.address.zipCode}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, zipCode: e.target.value } })}
                placeholder="78701"
              />
            </label>
            <label className="field">
              <span>Country</span>
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
              />
            </label>
            <button className="primary" onClick={() => setStep(2)} disabled={loading}>
              Next: Configure template
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="admin-grid">
            <label className="field">
              <span>Template</span>
              <select
                value={formData.templateType}
                onChange={(e) => setFormData({ ...formData, templateType: e.target.value as TemplateType })}
              >
                <option value="theater">Theater</option>
                <option value="stadium">Stadium</option>
                <option value="general_admission">General Admission</option>
              </select>
            </label>

            <div className="sections">
              <div className="sections-head">
                <p>Sections</p>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      sections: [
                        ...(prev.sections as TheaterSection[]),
                        {
                          sectionCode: `S${prev.sections.length + 1}`,
                          name: `Section ${prev.sections.length + 1}`,
                          rows: 4,
                          seatsPerRow: 10,
                          startX: 80,
                          startY: 150 + prev.sections.length * 160,
                          seatSpacing: 6,
                          rowSpacing: 10,
                        },
                      ],
                    }))
                  }
                >
                  + Add Section
                </button>
              </div>
              {(formData.sections as TheaterSection[]).map((section, idx) => (
                <div key={section.sectionCode} className="section-card">
                  <div className="section-row">
                    <label className="field small">
                      <span>Code</span>
                      <input
                        type="text"
                        value={section.sectionCode}
                        onChange={(e) => updateSection(idx, 'sectionCode', e.target.value)}
                      />
                    </label>
                    <label className="field small">
                      <span>Name</span>
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => updateSection(idx, 'name', e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="section-row">
                    <label className="field small">
                      <span>Rows</span>
                      <input
                        type="number"
                        value={section.rows}
                        onChange={(e) => updateSection(idx, 'rows', Number(e.target.value))}
                      />
                    </label>
                    <label className="field small">
                      <span>Seats/row</span>
                      <input
                        type="number"
                        value={section.seatsPerRow}
                        onChange={(e) => updateSection(idx, 'seatsPerRow', Number(e.target.value))}
                      />
                    </label>
                    <label className="field small">
                      <span>Seat spacing</span>
                      <input
                        type="number"
                        value={section.seatSpacing}
                        onChange={(e) => updateSection(idx, 'seatSpacing', Number(e.target.value))}
                      />
                    </label>
                    <label className="field small">
                      <span>Row spacing</span>
                      <input
                        type="number"
                        value={section.rowSpacing}
                        onChange={(e) => updateSection(idx, 'rowSpacing', Number(e.target.value))}
                      />
                    </label>
                  </div>
                  <div className="section-row">
                    <label className="field small">
                      <span>Start X</span>
                      <input
                        type="number"
                        value={section.startX}
                        onChange={(e) => updateSection(idx, 'startX', Number(e.target.value))}
                      />
                    </label>
                    <label className="field small">
                      <span>Start Y</span>
                      <input
                        type="number"
                        value={section.startY}
                        onChange={(e) => updateSection(idx, 'startY', Number(e.target.value))}
                      />
                    </label>
                    <label className="field small checkbox">
                      <input
                        type="checkbox"
                        checked={!!section.hasAisle}
                        onChange={(e) => updateSection(idx, 'hasAisle', e.target.checked)}
                      />
                      <span>Center aisle</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-actions">
              <button className="ghost" onClick={() => setStep(1)} disabled={loading}>
                Back
              </button>
              <button className="primary" onClick={handlePreview} disabled={loading}>
                {loading ? 'Generating...' : 'Preview seat map'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="admin-grid">
            <div className="preview" dangerouslySetInnerHTML={{ __html: previewSvg }} />
            <div className="admin-actions">
              <button className="ghost" onClick={() => setStep(2)} disabled={loading}>
                Back to edit
              </button>
              <button className="primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create venue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
